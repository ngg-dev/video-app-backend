import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XaiModule } from 'src/ai-providers/xai/xai.module';
import { StorageModule } from 'src/storage/storage.module';
import { CharacterGalleryController } from './character-gallery.controller';
import { CharacterGalleryService } from './character-gallery.service';
import { CharacterCollectionReaderService } from './character-collection-reader.service';
import { CharacterImageService } from './character-image.service';
import { CollectionStyleAnchorService } from './collection-style-anchor.service';
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
    CollectionStyleAnchorService,
  ],
  exports: [CharacterCollectionReaderService, CollectionStyleAnchorService],
})
export class CharacterGalleryModule {}
