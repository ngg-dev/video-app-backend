import { Module } from '@nestjs/common';
import { CreateVideoController } from './create-video.controller';
import { CreateVideoService } from './create-video.service';
import { CreateVideoCacheService } from './create-video-cache.service';
import { CreateVideoPromptService } from './create-video-prompt.service';
import { DeepSeekModule } from '@ai-providers/deepseek/deepseek.module';
import { XaiModule } from '@ai-providers/xai/xai.module';
import { StorageModule } from '@storage/storage.module';
import { CharacterGalleryModule } from 'src/character-gallery/character-gallery.module';

@Module({
  imports: [DeepSeekModule, XaiModule, StorageModule, CharacterGalleryModule],
  controllers: [CreateVideoController],
  providers: [
    CreateVideoService,
    CreateVideoPromptService,
    CreateVideoCacheService,
  ],
  exports: [CreateVideoService, CreateVideoCacheService],
})
export class CreateVideoModule {}
