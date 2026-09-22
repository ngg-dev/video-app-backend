import { Module } from '@nestjs/common';
import { VideoPipeController } from './video-pipe.controller';
import { VideoPipeService } from './video-pipe.service';
import { CreateVideoModule } from 'src/create-video/create-video.module';
import { MediaModule } from 'src/media/media.module';
import { CharacterGalleryModule } from 'src/character-gallery/character-gallery.module';

@Module({
  imports: [CreateVideoModule, MediaModule, CharacterGalleryModule],
  controllers: [VideoPipeController],
  providers: [VideoPipeService],
})
export class VideoPipeModule {}
