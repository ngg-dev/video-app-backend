import { CreateVideoCacheService } from './create-video-cache.service';
import { RedisService } from 'src/database/redis/redis.service';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { CREATE_VIDEO_URL_KEY_PREFIX } from './constants/video-url-storage.constant';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

describe('CreateVideoCacheService', () => {
  let service: CreateVideoCacheService;
  let redis: { get: jest.Mock; set: jest.Mock };
  let logger: AppLoggerService;

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn() };
    logger = new AppLoggerService();
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    service = new CreateVideoCacheService(
      redis as unknown as RedisService,
      logger,
    );
  });

  describe('buildKey', () => {
    it('starts with the configured prefix and is deterministic', () => {
      const key1 = service.buildKey(
        'a scene',
        'collection-1',
        VideoAspectRatio.Vertical,
      );
      const key2 = service.buildKey(
        'a scene',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      expect(key1).toBe(key2);
      expect(key1.startsWith(CREATE_VIDEO_URL_KEY_PREFIX)).toBe(true);
    });

    it('is case-insensitive for scenario', () => {
      const key1 = service.buildKey(
        'A Scene',
        'collection-1',
        VideoAspectRatio.Vertical,
      );
      const key2 = service.buildKey(
        'a scene',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      expect(key1).toBe(key2);
    });

    it('differs by collectionId', () => {
      const key1 = service.buildKey(
        'a scene',
        'collection-1',
        VideoAspectRatio.Vertical,
      );
      const key2 = service.buildKey(
        'a scene',
        'collection-2',
        VideoAspectRatio.Vertical,
      );

      expect(key1).not.toBe(key2);
    });

    it('differs by aspect ratio while staying deterministic per aspect ratio', () => {
      // Arrange
      // service is created in beforeEach

      // Act
      const verticalKey1 = service.buildKey(
        'a scene',
        'collection-1',
        VideoAspectRatio.Vertical,
      );
      const verticalKey2 = service.buildKey(
        'a scene',
        'collection-1',
        VideoAspectRatio.Vertical,
      );
      const horizontalKey = service.buildKey(
        'a scene',
        'collection-1',
        VideoAspectRatio.Horizontal,
      );

      // Assert
      expect(verticalKey1).toBe(verticalKey2);
      expect(verticalKey1).not.toBe(horizontalKey);
      expect(verticalKey1.startsWith(CREATE_VIDEO_URL_KEY_PREFIX)).toBe(true);
      expect(horizontalKey.startsWith(CREATE_VIDEO_URL_KEY_PREFIX)).toBe(true);
    });
  });

  describe('set', () => {
    it('calls redis.set with EX and the configured TTL', async () => {
      redis.set.mockResolvedValue('OK');

      await service.set('scenario', 'collection-1', VideoAspectRatio.Vertical, {
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });

      expect(redis.set).toHaveBeenCalledWith(
        service.buildKey('scenario', 'collection-1', VideoAspectRatio.Vertical),
        JSON.stringify({
          sceneImageUrl: 'https://img',
          sceneVideoUrl: 'https://video',
        }),
        'EX',
        3600,
      );
    });

    it('does not throw when redis.set rejects', async () => {
      redis.set.mockRejectedValue(new Error('redis down'));

      await expect(
        service.set('scenario', 'collection-1', VideoAspectRatio.Vertical, {
          sceneImageUrl: 'https://img',
          sceneVideoUrl: 'https://video',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('get', () => {
    it('returns the parsed pair for a valid JSON value', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({
          sceneImageUrl: 'https://img',
          sceneVideoUrl: 'https://video',
        }),
      );

      const result = await service.get(
        'scenario',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      expect(result).toEqual({
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });
    });

    it('returns null for broken JSON', async () => {
      redis.get.mockResolvedValue('not json');

      const result = await service.get(
        'scenario',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      expect(result).toBeNull();
    });

    it('returns null when a field is missing or empty', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ sceneImageUrl: '', sceneVideoUrl: 'https://video' }),
      );

      const result = await service.get(
        'scenario',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      expect(result).toBeNull();
    });

    it('returns null when redis.get throws', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));

      const result = await service.get(
        'scenario',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      expect(result).toBeNull();
    });

    it('returns null when there is no cached value', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.get(
        'scenario',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      expect(result).toBeNull();
    });
  });

  describe('get/set aspect ratio isolation', () => {
    it('does not serve a value cached under a different aspect ratio', async () => {
      // Arrange
      const store = new Map<string, string>();
      redis.set.mockImplementation((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK');
      });
      redis.get.mockImplementation((key: string) =>
        Promise.resolve(store.get(key) ?? null),
      );
      await service.set('scenario', 'collection-1', VideoAspectRatio.Vertical, {
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });

      // Act
      const missResult = await service.get(
        'scenario',
        'collection-1',
        VideoAspectRatio.Horizontal,
      );
      const hitResult = await service.get(
        'scenario',
        'collection-1',
        VideoAspectRatio.Vertical,
      );

      // Assert
      expect(missResult).toBeNull();
      expect(hitResult).toEqual({
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });
    });
  });
});
