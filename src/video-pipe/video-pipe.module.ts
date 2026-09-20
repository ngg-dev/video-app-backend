import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoPipeController } from './video-pipe.controller';
import { VideoPipeService } from './video-pipe.service';
import { CreateVideoModule } from 'src/create-video/create-video.module';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';

@Module({
  imports: [
    CreateVideoModule,
    TypeOrmModule.forFeature([
      CharacterCollectionItemEntity,
      CharacterItemEntity,
    ]),
  ],
  controllers: [VideoPipeController],
  providers: [VideoPipeService],
})
export class VideoPipeModule {}
