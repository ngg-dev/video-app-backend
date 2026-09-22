import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from '../entities/character-item.entity';

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

/**
 * Pick the characters mentioned by name in a (already normalized/lowercased) scenario, and
 * collect their reference images in the same order — falling back to `''` when a mentioned
 * character has no image.
 */
export function selectMentionedCharacters(
  scenario: string,
  characters: CharacterItemEntity[],
): { persons: CharacterItemEntity[]; referenceImages: string[] } {
  const persons = characters.filter(({ name }) =>
    scenario.includes(name.toLowerCase()),
  );
  const referenceImages = persons.map((person) => person.imageUrl || '');

  return { persons, referenceImages };
}
