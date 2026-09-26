import { Module } from '@nestjs/common';
import { S3_CLIENT, createS3Client } from './utils/s3-client';
import { StorageController } from './controllers/storage.controller';
import { StorageService } from './services/storage.service';

@Module({
  controllers: [StorageController],
  providers: [
    { provide: S3_CLIENT, useFactory: createS3Client },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
