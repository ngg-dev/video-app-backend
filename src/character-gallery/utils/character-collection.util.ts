import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CharacterCollectionItemEntity } from '../entities/character-item.entity';

/**
 * Every generated scene must share one visual style, and that style can only
 * come from the collection. Call this right after loading the collection,
 * before any prompt building or generation work starts.
 */
export function assertCollectionHasStyle(
  collection: CharacterCollectionItemEntity | null | undefined,
): asserts collection is CharacterCollectionItemEntity & { style: string } {
  if (!collection) {
    throw new NotFoundException('Character collection not found.');
  }

  if (!collection.style) {
    throw new BadRequestException(
      'Character collection has no style set. Set a style on the collection so every generated scene shares the same visual style.',
    );
  }
}
