import { Injectable } from '@nestjs/common';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { FfmpegService } from 'src/media/ffmpeg/ffmpeg.service';
import {
  escapePathForFilter,
  computeCropForAspectRatio,
} from 'src/media/utils/media-path.util';
import {
  buildConcatListContent,
  buildNormalizedConcatArgs,
  buildTrimArgs,
} from 'src/media/utils/ffmpeg-args.util';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import {
  VideoAspectRatio,
  VIDEO_ASPECT_RATIO_DIMENSIONS,
} from 'src/shared/constants/video-aspect-ratio';
import { MEDIA_TEMP_ARTIFACT_NAMES } from 'src/media/constants/media.constant';
import type {
  TrimOptions,
  TrimToShortsOptions,
  BurnSubtitlesOptions,
} from 'src/media/types/media.types';

@LogMethods()
@Injectable()
export class MediaService {
  constructor(private readonly ffmpeg: FfmpegService) {}

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

    let cropBox: ReturnType<typeof computeCropForAspectRatio> | undefined;
    if (crop?.aspectRatio) {
      const { width: iw, height: ih } =
        await this.ffmpeg.getVideoDimensions(inputPath);
      cropBox = computeCropForAspectRatio(iw, ih, crop.aspectRatio);
    }

    const args = buildTrimArgs(inputPath, outputPath, {
      startSec,
      endSec,
      durationSec,
      crop,
      cropBox,
    });
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
      crop: { aspectRatio: VideoAspectRatio.Vertical },
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
    const listPath = join(
      tmpdir(),
      MEDIA_TEMP_ARTIFACT_NAMES.concatListFileName(Date.now()),
    );
    const listContent = buildConcatListContent(inputPaths);
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
    return this.concatNormalized(
      inputPaths,
      outputPath,
      VIDEO_ASPECT_RATIO_DIMENSIONS[VideoAspectRatio.Vertical],
    );
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

    await this.ffmpeg.runFfmpeg(
      buildNormalizedConcatArgs(inputPaths, outputPath, size),
    );
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
