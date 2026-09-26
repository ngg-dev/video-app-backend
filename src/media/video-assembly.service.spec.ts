jest.mock('src/shared/utils', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('src/shared/utils');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    downloadBinaryToPath: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('video-bytes')),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

import { mkdir, rm } from 'fs/promises';
import { VideoAssemblyService } from './video-assembly.service';
import type { MediaService } from './media.service';
import type { StorageService } from '@storage/services/storage.service';
import type { AppLoggerService } from 'src/shared/logger/logger.service';
import { downloadBinaryToPath } from 'src/shared/utils';

describe('VideoAssemblyService', () => {
  let mediaService: { concatNormalized: jest.Mock; concat: jest.Mock };
  let storageService: { upload: jest.Mock };
  let loggerService: { log: jest.Mock };
  let service: VideoAssemblyService;

  beforeEach(() => {
    jest.clearAllMocks();

    mediaService = {
      concatNormalized: jest.fn().mockResolvedValue(undefined),
      concat: jest.fn().mockResolvedValue(undefined),
    };

    storageService = {
      upload: jest.fn().mockResolvedValue({
        key: 'videos/video-pipe/uuid.mp4',
        url: 'https://s3/final.mp4',
        etag: 'etag',
      }),
    };

    loggerService = { log: jest.fn() };

    service = new VideoAssemblyService(
      mediaService as unknown as MediaService,
      storageService as unknown as StorageService,
      loggerService as unknown as AppLoggerService,
    );
  });

  describe('concatNormalizedAndGetUrl', () => {
    it('downloads parts, concatenates normalized, uploads, and cleans up temp dir', async () => {
      // Arrange
      const inputUrls = ['https://s3/u1.mp4', 'https://s3/u2.mp4'];
      const size = { width: 1280, height: 720 };
      const keyPrefix = 'videos/video-pipe';

      // Act
      const result = await service.concatNormalizedAndGetUrl(inputUrls, {
        size,
        keyPrefix,
      });

      // Assert
      // Verify downloadBinaryToPath was called exactly 2 times (once per URL)
      expect(downloadBinaryToPath).toHaveBeenCalledTimes(2);

      expect(mediaService.concatNormalized).toHaveBeenCalledTimes(1);
      const concatCall = mediaService.concatNormalized.mock
        .calls[0] as unknown[];
      expect((concatCall[0] as unknown[]).length).toBe(2); // two part paths
      expect(String(concatCall[1])).toMatch(/result\.mp4$/); // result file name
      expect(concatCall[2]).toEqual(size);

      expect(storageService.upload).toHaveBeenCalledTimes(1);
      const uploadCall = storageService.upload.mock.calls[0] as unknown[];
      expect(String(uploadCall[0])).toMatch(
        /^videos\/video-pipe\/[0-9a-f-]{36}\.mp4$/,
      );
      expect(uploadCall[1]).toEqual(Buffer.from('video-bytes')); // from mocked readFile
      expect(uploadCall[2]).toBe('video/mp4');

      // Verify temp directory was cleaned up
      expect(mkdir).toHaveBeenCalled();
      expect(rm).toHaveBeenCalled();
      const rmCall = (rm as jest.Mock).mock.calls[0] as unknown[];
      expect(rmCall[1]).toEqual({ recursive: true, force: true });

      expect(result).toEqual({
        url: 'https://s3/final.mp4',
        key: 'videos/video-pipe/uuid.mp4',
      });
    });
  });

  describe('concatAndGetUrl', () => {
    it('uses concat instead of concatNormalized', async () => {
      // Arrange
      const inputUrls = ['https://s3/u1.mp4', 'https://s3/u2.mp4'];

      // Act
      await service.concatAndGetUrl(inputUrls);

      // Assert
      expect(mediaService.concat).toHaveBeenCalledTimes(1);
      expect(mediaService.concatNormalized).not.toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const uploadCall = storageService.upload.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(uploadCall[0]).toMatch(/^videos\/concat\//);
    });
  });

  describe('concatNormalizedVerticalAndGetUrl', () => {
    it('uses vertical dimensions from constant', async () => {
      // Arrange
      const inputUrls = ['https://s3/u1.mp4'];

      // Act
      await service.concatNormalizedVerticalAndGetUrl(inputUrls);

      // Assert
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const concatCall = mediaService.concatNormalized.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(concatCall[2]).toEqual({ width: 720, height: 1280 });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const uploadCall = storageService.upload.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(uploadCall[0]).toMatch(/^videos\/concat\//);
    });
  });

  describe('cleanup on error', () => {
    it('cleans up temp directory when concatenation fails', async () => {
      // Arrange
      const inputUrls = ['https://s3/u1.mp4'];
      const size = { width: 1280, height: 720 };

      mediaService.concatNormalized.mockRejectedValueOnce(
        new Error('ffmpeg failed'),
      );

      // Act & Assert
      await expect(
        service.concatNormalizedAndGetUrl(inputUrls, {
          size,
          keyPrefix: 'videos/video-pipe',
        }),
      ).rejects.toThrow('ffmpeg failed');

      expect(storageService.upload).not.toHaveBeenCalled();
      // Verify temp directory was cleaned up even on error
      expect(rm).toHaveBeenCalled();
      const rmCall = (rm as jest.Mock).mock.calls[0] as unknown[];
      expect(rmCall[1]).toEqual({ recursive: true, force: true });
    });
  });
});
