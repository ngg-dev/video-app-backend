import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XaiModule } from '@ai-providers/xai/xai.module';
import { StorageModule } from '@storage/storage.module';
import { CharacterGalleryController } from './character-gallery.controller';
import { CharacterGalleryService } from './character-gallery.service';
import { CharacterCollectionReaderService } from './character-collection-reader.service';
import { CharacterImageService } from './character-image.service';
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
  providers: [
    CharacterGalleryService,
    CharacterCollectionReaderService,
    CharacterImageService,
  ],
  exports: [CharacterCollectionReaderService],
})
export class CharacterGalleryModule {}
