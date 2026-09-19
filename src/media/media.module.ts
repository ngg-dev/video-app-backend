import { Module } from '@nestjs/common';
import { FfmpegModule } from 'src/media/ffmpeg/ffmpeg.module';
import { StorageModule } from 'src/storage/storage.module';
import { MediaController } from 'src/media/media.controller';
import { MediaService } from 'src/media/media.service';

@Module({
  imports: [FfmpegModule, StorageModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
