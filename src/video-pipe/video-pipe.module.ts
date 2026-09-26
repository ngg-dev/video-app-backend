import { Module } from '@nestjs/common';
import { VideoPipeController } from './video-pipe.controller';
import { VideoPipeService } from './video-pipe.service';
import { VideoStyleAnchorService } from './video-style-anchor.service';
import { CreateVideoModule } from 'src/create-video/create-video.module';
import { MediaModule } from 'src/media/media.module';
import { CharacterGalleryModule } from 'src/character-gallery/character-gallery.module';
import { XaiModule } from '@ai-providers/xai/xai.module';
import { StorageModule } from '@storage/storage.module';

@Module({
  imports: [
    CreateVideoModule,
    MediaModule,
    CharacterGalleryModule,
    XaiModule,
    StorageModule,
  ],
  controllers: [VideoPipeController],
  providers: [VideoPipeService, VideoStyleAnchorService],
})
export class VideoPipeModule {}
