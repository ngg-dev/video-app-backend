import { createHash } from 'node:crypto';
import { CreateVideoCacheService } from './create-video-cache.service';
import { RedisService } from 'src/database/redis/redis.service';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { CREATE_VIDEO_URL_KEY_PREFIX } from './constants/video-url-storage.constant';

describe('CreateVideoCacheService', () => {
  let service: CreateVideoCacheService;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let logger: AppLoggerService;

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
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
      const key1 = service.buildKey('a scene', 'collection-1');
      const key2 = service.buildKey('a scene', 'collection-1');

      expect(key1).toBe(key2);
      expect(key1.startsWith(CREATE_VIDEO_URL_KEY_PREFIX)).toBe(true);
    });

    it('is case-insensitive for scenario', () => {
      const key1 = service.buildKey('A Scene', 'collection-1');
      const key2 = service.buildKey('a scene', 'collection-1');

      expect(key1).toBe(key2);
    });

    it('differs by collectionId', () => {
      const key1 = service.buildKey('a scene', 'collection-1');
      const key2 = service.buildKey('a scene', 'collection-2');

      expect(key1).not.toBe(key2);
    });

    it('is computed strictly from scenario|collectionId, without aspect ratio or duration', () => {
      // Arrange
      const expected =
        CREATE_VIDEO_URL_KEY_PREFIX +
        createHash('sha256').update('a scene|collection-1').digest('hex');

      // Act
      const key = service.buildKey('A Scene', 'collection-1');

      // Assert
      expect(key).toBe(expected);
    });
  });

  describe('set', () => {
    it('calls redis.set with EX and the configured TTL', async () => {
      redis.set.mockResolvedValue('OK');

      await service.set('scenario', 'collection-1', {
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });

      expect(redis.set).toHaveBeenCalledWith(
        service.buildKey('scenario', 'collection-1'),
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
        service.set('scenario', 'collection-1', {
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

      const result = await service.get('scenario', 'collection-1');

      expect(result).toEqual({
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });
    });

    it('returns null for broken JSON', async () => {
      redis.get.mockResolvedValue('not json');

      const result = await service.get('scenario', 'collection-1');

      expect(result).toBeNull();
    });

    it('returns null when a field is missing or empty', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ sceneImageUrl: '', sceneVideoUrl: 'https://video' }),
      );

      const result = await service.get('scenario', 'collection-1');

      expect(result).toBeNull();
    });

    it('returns null when redis.get throws', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));

      const result = await service.get('scenario', 'collection-1');

      expect(result).toBeNull();
    });

    it('returns null when there is no cached value', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.get('scenario', 'collection-1');

      expect(result).toBeNull();
    });
  });

  describe('get/set collection isolation', () => {
    it('does not serve a value cached under a different collection', async () => {
      // Arrange
      const store = new Map<string, string>();
      redis.set.mockImplementation((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK');
      });
      redis.get.mockImplementation((key: string) =>
        Promise.resolve(store.get(key) ?? null),
      );
      await service.set('scenario', 'collection-1', {
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });

      // Act
      const missResult = await service.get('scenario', 'collection-2');
      const hitResult = await service.get('scenario', 'collection-1');

      // Assert
      expect(missResult).toBeNull();
      expect(hitResult).toEqual({
        sceneImageUrl: 'https://img',
        sceneVideoUrl: 'https://video',
      });
    });
  });

  describe('delMany', () => {
    it('deletes exactly the keys computed by buildKey', async () => {
      // Arrange
      redis.del.mockResolvedValue(2);
      const scenarios = ['a scene', 'b scene'];
      const collectionId = 'collection-1';

      // Act
      await service.delMany(scenarios, collectionId);

      // Assert
      expect(redis.del).toHaveBeenCalledTimes(1);
      expect(redis.del).toHaveBeenCalledWith(
        service.buildKey('a scene', collectionId),
        service.buildKey('b scene', collectionId),
      );
    });

    it('deduplicates repeated scenarios, including case-insensitive duplicates', async () => {
      // Arrange
      redis.del.mockResolvedValue(2);
      const scenarios = ['A Scene', 'a scene', 'b scene'];

      // Act
      await service.delMany(scenarios, 'collection-1');

      // Assert
      const calledKeys = redis.del.mock.calls[0] as string[];
      expect(calledKeys).toHaveLength(2);
    });

    it('does not call redis when the scenario list is empty', async () => {
      // Arrange
      redis.del.mockResolvedValue(0);

      // Act
      const result = await service.delMany([], 'collection-1');

      // Assert
      expect(redis.del).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('swallows a redis error without throwing', async () => {
      // Arrange
      redis.del.mockRejectedValue(new Error('redis down'));

      // Act
      const result = await service.delMany(['a scene'], 'collection-1');

      // Assert
      await expect(Promise.resolve(result)).resolves.toBeUndefined();
      const loggedErrorCalls = (logger.error as jest.Mock).mock.calls as [
        { event: string; error: unknown },
      ][];
      expect(
        loggedErrorCalls.some(
          ([payload]) => payload.event === 'create-video-cache.del.failed',
        ),
      ).toBe(true);
    });
  });
});
