import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';
import { assertCollectionHasStyle } from './utils/character-collection.util';

export interface CollectionWithCharacters {
  collection: CharacterCollectionItemEntity & { style: string };
  characters: CharacterItemEntity[];
}

/**
 * Loads a character collection together with its characters, validating that the
 * collection has a style set. Shared by every caller that needs both (create-video,
 * video-pipe) so they don't each duplicate the same pair of repository calls.
 */
@LogMethods()
@Injectable()
export class CharacterCollectionReaderService {
  constructor(
    @InjectRepository(CharacterCollectionItemEntity)
    private readonly characterCollectionItemRepository: Repository<CharacterCollectionItemEntity>,
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
  ) {}

  async loadCollectionWithCharacters(
    collectionId: string,
  ): Promise<CollectionWithCharacters> {
    const [collection, characters] = await Promise.all([
      this.characterCollectionItemRepository.findOne({
        where: { id: collectionId },
      }),
      this.characterItemRepository.find({
        where: { collectionId },
      }),
    ]);

    assertCollectionHasStyle(collection);

    return { collection, characters };
  }
}
