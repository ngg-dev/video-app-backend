import { S3Client } from '@aws-sdk/client-s3';
import {
  STORAGE_REGION,
  STORAGE_ENDPOINT,
  STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY,
} from 'src/storage/constants/storage.constants';

export const S3_CLIENT = Symbol('S3_CLIENT');

export function createS3Client(): S3Client {
  return new S3Client({
    region: STORAGE_REGION,
    endpoint: STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY ?? '',
      secretAccessKey: STORAGE_SECRET_KEY ?? '',
    },
  });
}
