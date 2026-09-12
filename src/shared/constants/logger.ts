import { LogLevel } from '@nestjs/common';

export const LOG_EVENT = {
  HTTP_REQUEST: 'http.request',
  HTTP_RESPONSE: 'http.response',
  METHOD_START: 'method.start',
  METHOD_END: 'method.end',
  METHOD_ERROR: 'method.error',
  EXTERNAL_REQUEST: 'external.request',
  EXTERNAL_RESPONSE: 'external.response',
  EXTERNAL_ERROR: 'external.error',
  UNHANDLED_REJECTION: 'unhandled.rejection',
  UNCAUGHT_EXCEPTION: 'uncaught.exception',
} as const;

export type LogEvent = (typeof LOG_EVENT)[keyof typeof LOG_EVENT];

export const LOG_MAX_STRING_LENGTH = 500;
export const LOG_MAX_ARRAY_ITEMS = 20;
export const LOG_MAX_DEPTH = 4;

export const LOG_REDACTED_KEYS = [
  'apiKey',
  'password',
  'token',
  'authorization',
  'secret',
];

export const LOG_REDACTED_PLACEHOLDER = '[REDACTED]';

export const LOG_LEVELS_ORDER: LogLevel[] = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
];

export function resolveLogLevels(level: LogLevel): LogLevel[] {
  const index = LOG_LEVELS_ORDER.indexOf(level);
  if (index === -1) {
    return LOG_LEVELS_ORDER;
  }
  return LOG_LEVELS_ORDER.slice(index);
}
