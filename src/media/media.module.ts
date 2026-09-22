import { Module } from '@nestjs/common';
import { FfmpegModule } from 'src/media/ffmpeg/ffmpeg.module';
import { StorageModule } from 'src/storage/storage.module';
import { MediaController } from 'src/media/media.controller';
import { MediaService } from 'src/media/media.service';
import { VideoAssemblyService } from 'src/media/video-assembly.service';

@Module({
  imports: [FfmpegModule, StorageModule],
  controllers: [MediaController],
  providers: [MediaService, VideoAssemblyService],
  exports: [MediaService, VideoAssemblyService],
})
export class MediaModule {}
