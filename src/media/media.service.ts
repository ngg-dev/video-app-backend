import { Injectable } from '@nestjs/common';
import { writeFile, unlink, readFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { FfmpegService } from 'src/media/ffmpeg/ffmpeg.service';
import {
  escapePathForConcat,
  escapePathForFilter,
  computeCropForAspectRatio,
} from 'src/media/utils/media-path.util';
import { StorageService } from 'src/storage/storage.service';
import { downloadBinaryToPath, isNotNullOrUndefined } from 'src/shared/utils';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { MEDIA_CONCAT_KEY_PREFIX } from 'src/media/constants/media.constant';
import type {
  TrimOptions,
  TrimToShortsOptions,
  BurnSubtitlesOptions,
} from 'src/media/types/media.types';

@LogMethods()
@Injectable()
export class MediaService {
  constructor(
    private readonly ffmpeg: FfmpegService,
    private readonly storage: StorageService,
    private readonly logger: AppLoggerService,
  ) {}

  /** Run ffmpeg (delegates to FfmpegService). Exposed for callers that need a one-off command. */
  async runFfmpeg(args: string[]): Promise<void> {
    return this.ffmpeg.runFfmpeg(args);
  }

  /**
   * Trim video by time and optionally crop to format (aspect or size).
   */
  async trim(
    inputPath: string,
    outputPath: string,
    options: TrimOptions,
  ): Promise<void> {
    const { startSec, endSec, durationSec, crop } = options;
    const args: string[] = ['-y', '-i', inputPath];

    // -ss before -i for fast seek (input seeking)
    args.push('-ss', String(startSec));
    if (isNotNullOrUndefined(endSec)) {
      args.push('-to', String(endSec));
    } else if (isNotNullOrUndefined(durationSec)) {
      args.push('-t', String(durationSec));
    }

    if (crop?.aspectRatio) {
      const { width: iw, height: ih } =
        await this.ffmpeg.getVideoDimensions(inputPath);
      const { cropW, cropH, cropX, cropY } = computeCropForAspectRatio(
        iw,
        ih,
        crop.aspectRatio,
      );
      args.push('-vf', `crop=${cropW}:${cropH}:${cropX}:${cropY}`);
    } else if (
      isNotNullOrUndefined(crop?.width) &&
      isNotNullOrUndefined(crop?.height)
    ) {
      args.push(
        '-vf',
        `scale=${crop.width}:${crop.height}:force_original_aspect_ratio=increase,crop=${crop.width}:${crop.height}`,
      );
    }

    args.push('-c', 'copy');
    if (args.includes('-vf')) {
      args.pop();
      args.pop();
      args.push('-c:v', 'libx264', '-c:a', 'aac');
    }
    args.push(outputPath);
    await this.ffmpeg.runFfmpeg(args);
  }

  /**
   * Crop video to vertical 9:16 for YouTube Shorts. Optionally trim by time (Shorts max 60s).
   */
  async trimToShorts(
    inputPath: string,
    outputPath: string,
    options?: TrimToShortsOptions,
  ): Promise<void> {
    return this.trim(inputPath, outputPath, {
      startSec: options?.startSec ?? 0,
      endSec: options?.endSec,
      durationSec: options?.durationSec,
      crop: { aspectRatio: '9:16' },
    });
  }

  /**
   * Concatenate videos (same codec/resolution recommended). Uses concat demuxer.
   * Single file → copy to output.
   */
  async concat(inputPaths: string[], outputPath: string): Promise<void> {
    if (inputPaths.length === 1) {
      await this.ffmpeg.runFfmpeg([
        '-y',
        '-i',
        inputPaths[0],
        '-c',
        'copy',
        outputPath,
      ]);
      return;
    }
    const listPath = join(tmpdir(), `ffmpeg-concat-${Date.now()}.txt`);
    const listContent = inputPaths
      .map((p) => `file ${escapePathForConcat(p)}`)
      .join('\n');
    await writeFile(listPath, listContent, 'utf8');
    try {
      await this.ffmpeg.runFfmpeg([
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-c',
        'copy',
        outputPath,
      ]);
    } finally {
      await unlink(listPath).catch(() => {});
    }
  }

  /**
   * Concatenate generated vertical clips through a filter graph and re-encode.
   * This avoids MP4/H264 stream-parameter drift from generated segments that can make
   * some players render later clips with broken geometry (for example duplicated
   * top/bottom frames) when using concat demuxer + `-c copy`.
   */
  async concatNormalizedVertical(
    inputPaths: string[],
    outputPath: string,
  ): Promise<void> {
    return this.concatNormalized(inputPaths, outputPath, {
      width: 720,
      height: 1280,
    });
  }

  /**
   * Concatenate generated clips through a filter graph and re-encode, normalizing every
   * input to the given size. This avoids MP4/H264 stream-parameter drift from generated
   * segments that can make some players render later clips with broken geometry (for
   * example duplicated top/bottom frames) when using concat demuxer + `-c copy`.
   */
  async concatNormalized(
    inputPaths: string[],
    outputPath: string,
    size: { width: number; height: number },
  ): Promise<void> {
    if (inputPaths.length === 0) {
      throw new Error('No videos to concatenate.');
    }

    const args: string[] = ['-y'];
    for (const p of inputPaths) {
      args.push('-i', p);
    }

    const filterParts: string[] = [];
    const concatInputs: string[] = [];
    for (let i = 0; i < inputPaths.length; i++) {
      filterParts.push(
        `[${i}:v:0]scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v${i}]`,
        `[${i}:a:0]aresample=async=1:first_pts=0[a${i}]`,
      );
      concatInputs.push(`[v${i}][a${i}]`);
    }
    filterParts.push(
      `${concatInputs.join('')}concat=n=${inputPaths.length}:v=1:a=1[v][a]`,
    );

    await this.ffmpeg.runFfmpeg([
      ...args,
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
  }

  /**
   * Download videos from URLs, concat them, upload result to storage, return public URL.
   * Intermediate files live only in tmpdir and are cleaned up after upload.
   */
  async concatAndGetUrl(
    inputUrls: string[],
  ): Promise<{ url: string; key: string }> {
    const requestId = randomUUID();
    const tempDir = join(tmpdir(), `concat-${requestId}`);
    await mkdir(tempDir, { recursive: true });

    try {
      this.logger.log(
        `[concat-and-get-url] Downloading ${inputUrls.length} video(s) to ${tempDir}`,
      );
      const partPaths = await Promise.all(
        inputUrls.map((url, i) => {
          const partPath = join(tempDir, `part-${i}.mp4`);
          return downloadBinaryToPath(url, partPath).then(() => partPath);
        }),
      );

      const resultPath = join(tempDir, 'result.mp4');
      this.logger.log(`[concat-and-get-url] Concatenating to ${resultPath}`);
      await this.concat(partPaths, resultPath);

      const buffer = await readFile(resultPath);
      const key = `${MEDIA_CONCAT_KEY_PREFIX}/${requestId}.mp4`;
      this.logger.log(`[concat-and-get-url] Uploading to storage key="${key}"`);
      const uploaded = await this.storage.upload(key, buffer, 'video/mp4');

      return { url: uploaded.url, key: uploaded.key };
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async concatNormalizedVerticalAndGetUrl(
    inputUrls: string[],
  ): Promise<{ url: string; key: string }> {
    return this.concatNormalizedAndGetUrl(inputUrls, {
      size: { width: 720, height: 1280 },
      keyPrefix: MEDIA_CONCAT_KEY_PREFIX,
    });
  }

  /**
   * Download videos from URLs, concat them normalized to the given size, upload the
   * result to storage under `<keyPrefix>/<requestId>.mp4`, return public URL and key.
   * Intermediate files live only in tmpdir and are cleaned up after upload.
   */
  async concatNormalizedAndGetUrl(
    inputUrls: string[],
    options: { size: { width: number; height: number }; keyPrefix: string },
  ): Promise<{ url: string; key: string }> {
    const requestId = randomUUID();
    const tempDir = join(tmpdir(), `concat-${requestId}`);
    await mkdir(tempDir, { recursive: true });

    try {
      this.logger.log(
        `[concat-normalized] Downloading ${inputUrls.length} video(s) to ${tempDir}`,
      );
      const partPaths = await Promise.all(
        inputUrls.map((url, i) => {
          const partPath = join(tempDir, `part-${i}.mp4`);
          return downloadBinaryToPath(url, partPath).then(() => partPath);
        }),
      );

      const resultPath = join(tempDir, 'result.mp4');
      this.logger.log(`[concat-normalized] Concatenating to ${resultPath}`);
      await this.concatNormalized(partPaths, resultPath, options.size);

      const buffer = await readFile(resultPath);
      const key = `${options.keyPrefix}/${requestId}.mp4`;
      this.logger.log(`[concat-normalized] Uploading to storage key="${key}"`);
      const uploaded = await this.storage.upload(key, buffer, 'video/mp4');

      return { url: uploaded.url, key: uploaded.key };
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Add or replace audio track on video.
   */
  async mergeAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string,
  ): Promise<void> {
    // -map 0:v:0 -map 1:a:0 -shortest (replaces original audio)
    const args = [
      '-y',
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-c:v',
      'copy',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      outputPath,
    ];
    await this.ffmpeg.runFfmpeg(args);
  }

  /**
   * Burn subtitles into video (SRT/ASS).
   */
  async burnSubtitles(
    videoPath: string,
    subtitlesPath: string,
    outputPath: string,
    options?: Pick<BurnSubtitlesOptions, 'escapePath'>,
  ): Promise<void> {
    const escapePath = options?.escapePath !== false;
    const subPath = escapePath
      ? escapePathForFilter(subtitlesPath)
      : subtitlesPath;
    const filter = `subtitles=${subPath}`;
    await this.ffmpeg.runFfmpeg([
      '-y',
      '-i',
      videoPath,
      '-vf',
      filter,
      '-c:a',
      'copy',
      outputPath,
    ]);
  }
}
