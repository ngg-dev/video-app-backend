import { randomUUID } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { S3_CLIENT } from './utils/s3-client';
import {
  STORAGE_BUCKET,
  STORAGE_ENDPOINT,
} from './constants/storage.constants';
import type { UploadResult, GeneratedFileLike } from './types/storage.types';

@LogMethods()
@Injectable()
export class StorageService {
  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly logger: AppLoggerService,
  ) {}

  async upload(
    key: string,
    body: Buffer | Uint8Array,
    contentType?: string,
  ): Promise<UploadResult> {
    const size = body instanceof Buffer ? body.length : body.byteLength;
    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    const response = await this.logger.trackExternalCall(
      {
        provider: 's3',
        operation: 'putObject',
        request: { key, size, contentType: contentType ?? 'none' },
      },
      () => this.s3.send(command),
      (result) => ({ etag: result.ETag ?? 'none' }),
    );
    const url = this.getPublicUrl(key);
    return { key, url, etag: response.ETag };
  }

  /** Upload an AI-generated file under `prefix`, deriving the extension from its media type. */
  async uploadGeneratedFile(
    file: GeneratedFileLike,
    prefix: string,
    fallbackExtension = 'png',
  ): Promise<UploadResult> {
    const extension = file.mediaType?.split('/')[1] ?? fallbackExtension;
    const key = `${prefix}/${Date.now()}-${randomUUID()}.${extension}`;

    return this.upload(key, Buffer.from(file.uint8Array), file.mediaType);
  }

  /** Public URL for a key (if bucket is public). Path-style: endpoint/bucket/key. */
  getPublicUrl(key: string): string {
    const base = STORAGE_ENDPOINT.replace(/\/$/, '');
    return `${base}/${STORAGE_BUCKET}/${key}`;
  }

  /** Delete object by key. */
  async delete(key: string): Promise<void> {
    await this.logger.trackExternalCall(
      { provider: 's3', operation: 'deleteObject', request: { key } },
      () =>
        this.s3.send(
          new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }),
        ),
    );
  }

  /** Check if object exists. */
  async exists(key: string): Promise<boolean> {
    try {
      await this.logger.trackExternalCall(
        { provider: 's3', operation: 'headObject', request: { key } },
        () =>
          this.s3.send(
            new HeadObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }),
          ),
      );
      return true;
    } catch {
      return false;
    }
  }
}
