import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/database/redis/redis.service';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { sanitizeForLog } from 'src/shared/logger/sanitize';
import { CreateVideoResponseDto } from './dto/create-video.dto';
import {
  CREATE_VIDEO_URL_KEY_PREFIX,
  CREATE_VIDEO_URL_TTL_SECONDS,
} from './constants/video-url-storage.constant';

@LogMethods()
@Injectable()
export class CreateVideoCacheService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: AppLoggerService,
  ) {}

  buildKey(scenario: string, collectionId: string): string {
    const hash = createHash('sha256')
      .update(`${scenario.toLowerCase()}|${collectionId}`)
      .digest('hex');

    return `${CREATE_VIDEO_URL_KEY_PREFIX}${hash}`;
  }

  async get(
    scenario: string,
    collectionId: string,
  ): Promise<CreateVideoResponseDto | null> {
    const key = this.buildKey(scenario, collectionId);

    try {
      const raw = await this.logger.trackExternalCall(
        {
          provider: 'redis',
          operation: 'get',
          request: { key },
        },
        () => this.redis.get(key),
      );

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<CreateVideoResponseDto>;

      if (
        typeof parsed.sceneImageUrl === 'string' &&
        parsed.sceneImageUrl.length > 0 &&
        typeof parsed.sceneVideoUrl === 'string' &&
        parsed.sceneVideoUrl.length > 0
      ) {
        return {
          sceneImageUrl: parsed.sceneImageUrl,
          sceneVideoUrl: parsed.sceneVideoUrl,
        };
      }

      return null;
    } catch (error) {
      this.logger.error({
        event: 'create-video-cache.get.failed',
        error: sanitizeForLog(error),
      });
      return null;
    }
  }

  async set(
    scenario: string,
    collectionId: string,
    value: CreateVideoResponseDto,
  ): Promise<void> {
    const key = this.buildKey(scenario, collectionId);

    try {
      await this.logger.trackExternalCall(
        {
          provider: 'redis',
          operation: 'set',
          request: { key },
        },
        () =>
          this.redis.set(
            key,
            JSON.stringify(value),
            'EX',
            CREATE_VIDEO_URL_TTL_SECONDS,
          ),
      );
    } catch (error) {
      this.logger.error({
        event: 'create-video-cache.set.failed',
        error: sanitizeForLog(error),
      });
    }
  }

  async delMany(scenarios: string[], collectionId: string): Promise<void> {
    const keys = [
      ...new Set(
        scenarios.map((scenario) => this.buildKey(scenario, collectionId)),
      ),
    ];

    if (keys.length === 0) {
      return;
    }

    try {
      await this.logger.trackExternalCall(
        {
          provider: 'redis',
          operation: 'del',
          request: { keys },
        },
        () => this.redis.del(...keys),
      );
    } catch (error) {
      this.logger.error({
        event: 'create-video-cache.del.failed',
        error: sanitizeForLog(error),
      });
    }
  }
}
