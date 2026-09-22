import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

/**
 * Create a temp directory, run `fn` with its path, then always remove it — regardless of
 * whether `fn` resolved or rejected. Reusable for any "scratch dir → cleanup" flow.
 */
export async function withTempDir<T>(
  prefix: string,
  fn: (dir: string) => Promise<T>,
): Promise<T> {
  const dir = join(tmpdir(), `${prefix}-${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
