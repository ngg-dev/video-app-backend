import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from 'src/shared/constants/config';

@Injectable()
export class RedisService extends Redis {
  constructor() {
    super({
      host: REDIS_HOST,
      port: REDIS_PORT,
    });
  }
}
