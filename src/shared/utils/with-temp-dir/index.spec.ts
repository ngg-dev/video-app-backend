jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

import { mkdir, rm } from 'fs/promises';
import { withTempDir } from './index';

describe('withTempDir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a temp directory, calls fn with it, and cleans up on success', async () => {
    // Arrange
    const fn = jest.fn().mockResolvedValue('ok');

    // Act
    const result = await withTempDir('test-prefix', fn);

    // Assert
    expect(result).toBe('ok');
    expect(mkdir).toHaveBeenCalledTimes(1);
    const mkdirCall = (mkdir as jest.Mock).mock.calls[0] as unknown[];
    expect(mkdirCall[0]).toMatch(/test-prefix-/);
    expect(mkdirCall[1]).toEqual({ recursive: true });

    expect(fn).toHaveBeenCalledTimes(1);
    const fnArg = (fn.mock.calls[0] as unknown[])[0] as string;
    expect(fnArg).toMatch(/test-prefix-/);

    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(fnArg, {
      recursive: true,
      force: true,
    });
  });

  it('cleans up even when fn throws', async () => {
    // Arrange
    const fn = jest.fn().mockRejectedValue(new Error('boom'));

    // Act & Assert
    await expect(withTempDir('test-prefix', fn)).rejects.toThrow('boom');

    const fnArg = (fn.mock.calls[0] as unknown[])[0] as string;
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(fnArg, {
      recursive: true,
      force: true,
    });
  });
});
