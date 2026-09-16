import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XaiModule } from 'src/ai-providers/xai/xai.module';
import { StorageModule } from 'src/storage/storage.module';
import { CharacterGalleryController } from './character-gallery.controller';
import { CharacterGalleryService } from './character-gallery.service';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CharacterItemEntity,
      CharacterCollectionItemEntity,
    ]),
    XaiModule,
    StorageModule,
  ],
  controllers: [CharacterGalleryController],
  providers: [CharacterGalleryService],
})
export class CharacterGalleryModule {}
