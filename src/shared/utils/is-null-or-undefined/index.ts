export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isNotNull<T>(value: T): value is Exclude<T, null> {
  return value !== null;
}

export function isNotUndefined<T>(value: T): value is Exclude<T, undefined> {
  return value !== undefined;
}

export function isNotNullOrUndefined<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
