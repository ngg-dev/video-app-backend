import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../services/storage.service';
import { UploadResponseDto } from '../dto/upload-response.dto';
import type { MulterFile } from '../types/storage.types';

const DEFAULT_PREFIX = 'images/';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /**
   * Upload single file (multipart/form-data, field name "file").
   * Optional query: prefix (e.g. "videos/") — key will be prefix + timestamp + originalname.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: MulterFile | undefined,
    @Query('prefix') prefix?: string,
  ): Promise<UploadResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded.');
    }
    const keyPrefix =
      prefix && /^[a-z0-9/_-]+$/i.test(prefix) ? prefix : DEFAULT_PREFIX;
    const key = `${keyPrefix}${Date.now()}-${file.originalname ?? 'file'}`;
    const result = await this.storage.upload(key, file.buffer, file.mimetype);
    return {
      message: 'File uploaded successfully',
      url: result.url,
      key: result.key,
      etag: result.etag,
    };
  }
}
