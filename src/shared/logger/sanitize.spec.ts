import { sanitizeForLog } from './sanitize';
import {
  LOG_MAX_STRING_LENGTH,
  LOG_REDACTED_PLACEHOLDER,
} from '../constants/logger';

describe('sanitizeForLog', () => {
  it('truncates strings longer than LOG_MAX_STRING_LENGTH', () => {
    const longString = 'a'.repeat(LOG_MAX_STRING_LENGTH + 50);

    const result = sanitizeForLog(longString) as string;

    expect(result.startsWith('a'.repeat(LOG_MAX_STRING_LENGTH))).toBe(true);
    expect(result).toContain('…(+50 chars)');
  });

  it('redacts keys that look like secrets, case-insensitively', () => {
    const result = sanitizeForLog({
      apiKey: 'super-secret',
      Authorization: 'Bearer xyz',
      nested: { password: 'hunter2' },
    }) as Record<string, unknown>;

    expect(result.apiKey).toBe(LOG_REDACTED_PLACEHOLDER);
    expect(result.Authorization).toBe(LOG_REDACTED_PLACEHOLDER);
    expect((result.nested as Record<string, unknown>).password).toBe(
      LOG_REDACTED_PLACEHOLDER,
    );
  });

  it('caps object depth beyond LOG_MAX_DEPTH', () => {
    const result = sanitizeForLog({ a: { b: { c: { d: { e: 1 } } } } });

    expect(JSON.stringify(result)).toContain('[Object]');
  });

  it('truncates arrays to LOG_MAX_ARRAY_ITEMS', () => {
    const result = sanitizeForLog(
      Array.from({ length: 30 }, (_, i) => i),
    ) as unknown[];

    expect(result.length).toBeLessThanOrEqual(21);
  });

  it('handles circular references without throwing', () => {
    const value: Record<string, unknown> = { name: 'circular' };
    value.self = value;

    expect(() => sanitizeForLog(value)).not.toThrow();
  });

  it('passes through null and undefined unchanged', () => {
    expect(sanitizeForLog(null)).toBeNull();
    expect(sanitizeForLog(undefined)).toBeUndefined();
  });
});
