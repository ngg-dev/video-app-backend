export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? '';

export const XAI_API_KEY = process.env.XAI_API_KEY ?? '';

export const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
export const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);

export const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const LOG_LEVEL =
  process.env.LOG_LEVEL ?? (NODE_ENV === 'production' ? 'log' : 'debug');

export const LOG_PAYLOADS =
  process.env.LOG_PAYLOADS !== undefined
    ? process.env.LOG_PAYLOADS === 'true'
    : NODE_ENV !== 'production';
