jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

import { randomUUID } from 'node:crypto';
import { StorageService } from './storage.service';
import type { S3Client } from '@aws-sdk/client-s3';
import type { AppLoggerService } from 'src/shared/logger/logger.service';
import type { UploadResult } from './types/storage.types';

describe('StorageService.uploadGeneratedFile', () => {
  let s3Stub: Record<string, unknown>;
  let loggerStub: Record<string, unknown>;
  let service: StorageService;
  let uploadSpy: jest.SpyInstance;

  beforeEach(() => {
    s3Stub = {};
    loggerStub = {};
    service = new StorageService(
      s3Stub as unknown as S3Client,
      loggerStub as unknown as AppLoggerService,
    );

    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    (randomUUID as jest.Mock).mockReturnValue('uuid-1');
    uploadSpy = jest.spyOn(service, 'upload').mockResolvedValue({
      key: 'k',
      url: 'https://storage.example/k',
      etag: 'e',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the key from prefix, time, uuid and the extension from mediaType', async () => {
    // Arrange
    const file = { uint8Array: new Uint8Array([1, 2]), mediaType: 'image/png' };

    // Act
    await service.uploadGeneratedFile(file, 'scenes', 'png');

    // Assert
    expect(uploadSpy).toHaveBeenCalledTimes(1);
    const [key, body, contentType] = uploadSpy.mock.calls[0] as [
      string,
      Buffer,
      string | undefined,
    ];
    expect(key).toBe('scenes/1700000000000-uuid-1.png');
    expect(body).toBeInstanceOf(Buffer);
    expect(new Uint8Array(body)).toEqual(new Uint8Array([1, 2]));
    expect(contentType).toBe('image/png');
  });

  it('returns the whole UploadResult, not just the url', async () => {
    // Arrange
    const file = { uint8Array: new Uint8Array([1, 2]), mediaType: 'image/png' };

    // Act
    const result = await service.uploadGeneratedFile(file, 'scenes', 'png');

    // Assert
    const expected: UploadResult = {
      key: 'k',
      url: 'https://storage.example/k',
      etag: 'e',
    };
    expect(result).toEqual(expected);
  });

  it('derives the extension from the second part of mediaType, not from "image"', async () => {
    // Arrange
    const file = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };

    // Act
    await service.uploadGeneratedFile(file, 'scene-videos', 'png');

    // Assert
    const [key] = uploadSpy.mock.calls[0] as [string];
    expect(key.endsWith('.mp4')).toBe(true);
    expect(key.endsWith('.video')).toBe(false);
    expect(key.endsWith('.png')).toBe(false);
  });

  it('uses the given fallbackExtension when mediaType is absent', async () => {
    // Arrange
    const file = { uint8Array: new Uint8Array() };

    // Act
    await service.uploadGeneratedFile(file, 'scenes', 'webp');

    // Assert
    const [key, , contentType] = uploadSpy.mock.calls[0] as [
      string,
      Buffer,
      string | undefined,
    ];
    expect(key.endsWith('.webp')).toBe(true);
    expect(contentType).toBeUndefined();
  });

  it('defaults to "png" when both mediaType and fallbackExtension are absent', async () => {
    // Arrange
    const file = { uint8Array: new Uint8Array() };

    // Act
    await service.uploadGeneratedFile(file, 'scenes');

    // Assert
    const [key] = uploadSpy.mock.calls[0] as [string];
    expect(key.endsWith('.png')).toBe(true);
  });
});
