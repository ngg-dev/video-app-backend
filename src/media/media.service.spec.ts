jest.mock('src/shared/utils', () => ({
  downloadBinaryToPath: jest.fn().mockResolvedValue(undefined),
  isNotNullOrUndefined: <T>(value: T): boolean =>
    value !== null && value !== undefined,
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('video-bytes')),
  rm: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { mkdir, readFile, rm } from 'fs/promises';
import { MediaService } from './media.service';
import type { FfmpegService } from './ffmpeg/ffmpeg.service';
import type { StorageService } from 'src/storage/storage.service';
import type { AppLoggerService } from 'src/shared/logger/logger.service';
import { downloadBinaryToPath } from 'src/shared/utils';

describe('MediaService', () => {
  let ffmpeg: { runFfmpeg: jest.Mock };
  let storage: { upload: jest.Mock };
  let logger: { log: jest.Mock };
  let service: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    ffmpeg = { runFfmpeg: jest.fn().mockResolvedValue(undefined) };
    storage = {
      upload: jest.fn().mockImplementation((key: string) =>
        Promise.resolve({
          key,
          url: 'https://s3/final.mp4',
          etag: 'etag',
        }),
      ),
    };
    logger = { log: jest.fn() };
    service = new MediaService(
      ffmpeg as unknown as FfmpegService,
      storage as unknown as StorageService,
      logger as unknown as AppLoggerService,
    );
  });

  describe('concatNormalized', () => {
    it('builds the filter-graph for the given target size', async () => {
      // Arrange
      const inputPaths = ['a.mp4', 'b.mp4'];

      // Act
      await service.concatNormalized(inputPaths, 'out.mp4', {
        width: 1280,
        height: 720,
      });

      // Assert
      const [args] = ffmpeg.runFfmpeg.mock.calls[0] as [string[]];
      const filterIndex = args.indexOf('-filter_complex');
      expect(filterIndex).toBeGreaterThan(-1);
      const filterGraph = args[filterIndex + 1];
      const scaleOccurrences = filterGraph.match(
        /scale=1280:720:force_original_aspect_ratio=decrease/g,
      );
      const padOccurrences = filterGraph.match(/pad=1280:720:/g);
      expect(scaleOccurrences).toHaveLength(2);
      expect(padOccurrences).toHaveLength(2);
      expect(filterGraph).toContain('concat=n=2:v=1:a=1[v][a]');
    });

    it('rejects an empty input list without calling ffmpeg', async () => {
      // Arrange
      // ffmpeg/service already set up in beforeEach

      // Act & Assert
      await expect(
        service.concatNormalized([], 'out.mp4', { width: 720, height: 1280 }),
      ).rejects.toThrow('No videos to concatenate.');
      expect(ffmpeg.runFfmpeg).not.toHaveBeenCalled();
    });
  });

  describe('concatNormalizedVertical', () => {
    it('keeps the vertical 720x1280 filter-graph (public contract unchanged)', async () => {
      // Arrange
      const inputPaths = ['a.mp4', 'b.mp4'];

      // Act
      await service.concatNormalizedVertical(inputPaths, 'out.mp4');

      // Assert
      const [args] = ffmpeg.runFfmpeg.mock.calls[0] as [string[]];
      const filterIndex = args.indexOf('-filter_complex');
      const filterGraph = args[filterIndex + 1];
      expect(filterGraph).toContain('scale=720:1280:');
      expect(filterGraph).toContain('pad=720:1280:');
    });
  });

  describe('concatNormalizedAndGetUrl', () => {
    it('downloads every input, uploads under <keyPrefix>/<uuid>.mp4 as video/mp4, and returns the storage pair', async () => {
      // Arrange
      const inputUrls = ['u1', 'u2'];

      // Act
      const result = await service.concatNormalizedAndGetUrl(inputUrls, {
        size: { width: 1280, height: 720 },
        keyPrefix: 'videos/video-pipe',
      });

      // Assert
      expect(downloadBinaryToPath).toHaveBeenCalledTimes(2);
      expect(mkdir).toHaveBeenCalled();
      expect(readFile).toHaveBeenCalled();
      expect(rm).toHaveBeenCalled();

      expect(storage.upload).toHaveBeenCalledTimes(1);
      const [uploadedKey, , contentType] = storage.upload.mock.calls[0] as [
        string,
        Buffer,
        string,
      ];
      expect(uploadedKey).toMatch(/^videos\/video-pipe\/[0-9a-f-]{36}\.mp4$/);
      expect(contentType).toBe('video/mp4');

      expect(result).toEqual({ url: 'https://s3/final.mp4', key: uploadedKey });
    });
  });
});
