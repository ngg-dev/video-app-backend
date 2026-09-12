import {
  LOG_MAX_ARRAY_ITEMS,
  LOG_MAX_DEPTH,
  LOG_MAX_STRING_LENGTH,
  LOG_REDACTED_KEYS,
  LOG_REDACTED_PLACEHOLDER,
} from '../constants/logger';

const REDACTED_KEYS_LOWER = LOG_REDACTED_KEYS.map((key) => key.toLowerCase());

function truncateString(value: string): string {
  if (value.length <= LOG_MAX_STRING_LENGTH) {
    return value;
  }
  const removed = value.length - LOG_MAX_STRING_LENGTH;
  return `${value.slice(0, LOG_MAX_STRING_LENGTH)}…(+${removed} chars)`;
}

function isRedactedKey(key: string): boolean {
  return REDACTED_KEYS_LOWER.includes(key.toLowerCase());
}

export function sanitizeForLog(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer: ${value.length} bytes]`;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
      stack: value.stack ? truncateString(value.stack) : undefined,
    };
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  if (depth >= LOG_MAX_DEPTH) {
    return Array.isArray(value) ? '[Array]' : '[Object]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const truncated = value.slice(0, LOG_MAX_ARRAY_ITEMS);
    const result = truncated.map((item) =>
      sanitizeForLog(item, depth + 1, seen),
    );
    if (value.length > LOG_MAX_ARRAY_ITEMS) {
      result.push(`…(+${value.length - LOG_MAX_ARRAY_ITEMS} items)`);
    }
    return result;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = isRedactedKey(key)
      ? LOG_REDACTED_PLACEHOLDER
      : sanitizeForLog(val, depth + 1, seen);
  }
  return result;
}
