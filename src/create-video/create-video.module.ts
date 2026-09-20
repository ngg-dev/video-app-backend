import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateVideoController } from './create-video.controller';
import { CreateVideoService } from './create-video.service';
import { CreateVideoCacheService } from './create-video-cache.service';
import { CreateVideoPromptService } from './create-video-prompt.service';
import { DeepSeekModule } from 'src/ai-providers/deepseek/deepseek.module';
import { XaiModule } from 'src/ai-providers/xai/xai.module';
import { StorageModule } from 'src/storage/storage.module';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';

@Module({
  imports: [
    DeepSeekModule,
    XaiModule,
    StorageModule,
    TypeOrmModule.forFeature([
      CharacterCollectionItemEntity,
      CharacterItemEntity,
    ]),
  ],
  controllers: [CreateVideoController],
  providers: [
    CreateVideoService,
    CreateVideoPromptService,
    CreateVideoCacheService,
  ],
  exports: [CreateVideoService],
})
export class CreateVideoModule {}
