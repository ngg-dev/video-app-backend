import {
  isNotNull,
  isNotNullOrUndefined,
  isNotUndefined,
  isNull,
  isNullOrUndefined,
  isUndefined,
} from './index';

const values = [null, undefined, 0, '', false, NaN, {}, []];

describe('isNull', () => {
  it.each(values)('isNull(%p)', (value) => {
    expect(isNull(value)).toBe(value === null);
  });
});

describe('isNotNull', () => {
  it.each(values)('isNotNull(%p)', (value) => {
    expect(isNotNull(value)).toBe(value !== null);
  });
});

describe('isUndefined', () => {
  it.each(values)('isUndefined(%p)', (value) => {
    expect(isUndefined(value)).toBe(value === undefined);
  });
});

describe('isNotUndefined', () => {
  it.each(values)('isNotUndefined(%p)', (value) => {
    expect(isNotUndefined(value)).toBe(value !== undefined);
  });
});

describe('isNullOrUndefined', () => {
  it.each(values)('isNullOrUndefined(%p)', (value) => {
    expect(isNullOrUndefined(value)).toBe(
      value === null || value === undefined,
    );
  });
});

describe('isNotNullOrUndefined', () => {
  it.each(values)('isNotNullOrUndefined(%p)', (value) => {
    expect(isNotNullOrUndefined(value)).toBe(
      value !== null && value !== undefined,
    );
  });

  it('returns true for falsy-but-defined values', () => {
    expect(isNotNullOrUndefined(0)).toBe(true);
    expect(isNotNullOrUndefined('')).toBe(true);
    expect(isNotNullOrUndefined(false)).toBe(true);
  });
});
