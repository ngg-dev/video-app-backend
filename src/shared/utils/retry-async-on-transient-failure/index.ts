import { HttpException } from '@nestjs/common';
import { isTransientNetworkError } from '../is-transient-network-error';
import { sleep } from '../sleep';

/**
 * Retries `operation` up to `maxAttempts` times with linear back-off.
 * Client errors (HTTP 4xx) are rethrown immediately.
 */
export async function retryAsyncOnTransientFailure<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(baseDelayMs * attempt);
    }
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (err instanceof HttpException && err.getStatus() < 500) throw err;
      const isRetryableHttp =
        err instanceof HttpException && err.getStatus() >= 500;
      if (!isRetryableHttp && !isTransientNetworkError(err)) {
        throw err;
      }
    }
  }
  throw lastError;
}
