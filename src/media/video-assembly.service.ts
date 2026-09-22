import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { MediaService } from 'src/media/media.service';
import { StorageService } from 'src/storage/storage.service';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { downloadBinaryToPath, withTempDir } from 'src/shared/utils';
import {
  MEDIA_CONCAT_KEY_PREFIX,
  MEDIA_TEMP_ARTIFACT_NAMES,
  MEDIA_VIDEO_CONTENT_TYPE,
} from 'src/media/constants/media.constant';
import {
  VideoAspectRatio,
  VIDEO_ASPECT_RATIO_DIMENSIONS,
} from 'src/shared/constants/video-aspect-ratio';

interface AssembleOptions {
  keyPrefix: string;
  concatStep: (partPaths: string[], resultPath: string) => Promise<void>;
}

/**
 * Orchestrates assembling a video from remote parts: download → concat (via MediaService) →
 * upload to storage → clean up. MediaService itself stays focused on ffmpeg operations.
 */
@LogMethods()
@Injectable()
export class VideoAssemblyService {
  constructor(
    private readonly mediaService: MediaService,
    private readonly storage: StorageService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Download videos from URLs, concat them, upload result to storage, return public URL.
   */
  async concatAndGetUrl(
    inputUrls: string[],
  ): Promise<{ url: string; key: string }> {
    return this.assemble(inputUrls, {
      keyPrefix: MEDIA_CONCAT_KEY_PREFIX,
      concatStep: (partPaths, resultPath) =>
        this.mediaService.concat(partPaths, resultPath),
    });
  }

  async concatNormalizedVerticalAndGetUrl(
    inputUrls: string[],
  ): Promise<{ url: string; key: string }> {
    return this.concatNormalizedAndGetUrl(inputUrls, {
      size: VIDEO_ASPECT_RATIO_DIMENSIONS[VideoAspectRatio.Vertical],
      keyPrefix: MEDIA_CONCAT_KEY_PREFIX,
    });
  }

  /**
   * Download videos from URLs, concat them normalized to the given size, upload the
   * result to storage under `<keyPrefix>/<requestId>.mp4`, return public URL and key.
   */
  async concatNormalizedAndGetUrl(
    inputUrls: string[],
    options: { size: { width: number; height: number }; keyPrefix: string },
  ): Promise<{ url: string; key: string }> {
    return this.assemble(inputUrls, {
      keyPrefix: options.keyPrefix,
      concatStep: (partPaths, resultPath) =>
        this.mediaService.concatNormalized(partPaths, resultPath, options.size),
    });
  }

  private async assemble(
    inputUrls: string[],
    { keyPrefix, concatStep }: AssembleOptions,
  ): Promise<{ url: string; key: string }> {
    const requestId = randomUUID();

    return withTempDir(MEDIA_TEMP_ARTIFACT_NAMES.tempDirPrefix, async (dir) => {
      this.logger.log(
        `[video-assembly] Downloading ${inputUrls.length} video(s) to ${dir}`,
      );
      const partPaths = await this.downloadParts(inputUrls, dir);

      const resultPath = join(dir, MEDIA_TEMP_ARTIFACT_NAMES.resultFileName);
      this.logger.log(`[video-assembly] Concatenating to ${resultPath}`);
      await concatStep(partPaths, resultPath);

      const buffer = await readFile(resultPath);
      const key = `${keyPrefix}/${requestId}.mp4`;
      this.logger.log(`[video-assembly] Uploading to storage key="${key}"`);
      const uploaded = await this.storage.upload(
        key,
        buffer,
        MEDIA_VIDEO_CONTENT_TYPE,
      );

      return { url: uploaded.url, key: uploaded.key };
    });
  }

  private async downloadParts(
    inputUrls: string[],
    dir: string,
  ): Promise<string[]> {
    return Promise.all(
      inputUrls.map((url, i) => {
        const partPath = join(dir, MEDIA_TEMP_ARTIFACT_NAMES.partFileName(i));
        return downloadBinaryToPath(url, partPath).then(() => partPath);
      }),
    );
  }
}
