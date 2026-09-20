import { isNotUndefined } from '../utils/is-null-or-undefined';

export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? '';

export const XAI_API_KEY = process.env.XAI_API_KEY ?? '';

export const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
export const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);

export const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const LOG_LEVEL =
  process.env.LOG_LEVEL ?? (NODE_ENV === 'production' ? 'log' : 'debug');

export const LOG_PAYLOADS = isNotUndefined(process.env.LOG_PAYLOADS)
  ? process.env.LOG_PAYLOADS === 'true'
  : NODE_ENV !== 'production';

export const AWS_KEY_ID = process.env.AWS_KEY_ID ?? '';
export const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY ?? '';
export const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
export const STORAGE_REGION = process.env.STORAGE_REGION ?? 'ru-central1';
export const STORAGE_ENDPOINT =
  process.env.STORAGE_ENDPOINT ?? 'https://storage.yandexcloud.net';
