import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  assertCollectionHasStyle,
  selectMentionedCharacters,
} from './character-collection.util';

describe('assertCollectionHasStyle', () => {
  it('does not throw when the collection has a style', () => {
    // Arrange
    const collection = { id: 'c-1', style: 'noir' } as never;

    // Act & Assert
    expect(() => assertCollectionHasStyle(collection)).not.toThrow();
  });

  it('throws NotFoundException when the collection is null', () => {
    // Act & Assert
    expect(() => assertCollectionHasStyle(null)).toThrow(NotFoundException);
  });

  it('throws NotFoundException when the collection is undefined', () => {
    // Act & Assert
    expect(() => assertCollectionHasStyle(undefined)).toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when the collection has no style', () => {
    // Arrange
    const collection = { id: 'c-1', style: null } as never;

    // Act & Assert
    expect(() => assertCollectionHasStyle(collection)).toThrow(
      BadRequestException,
    );
  });
});

describe('selectMentionedCharacters', () => {
  it('selects characters mentioned by name in the scenario and collects their reference images', () => {
    // Arrange
    const scenario = 'боб встречает алиса';
    const characters = [
      { name: 'Боб', imageUrl: 'https://img/bob.png' },
      { name: 'Кэрол', imageUrl: null },
      { name: 'Алиса', imageUrl: 'https://img/alice.png' },
    ] as never;

    // Act
    const { persons, referenceImages } = selectMentionedCharacters(
      scenario,
      characters,
    );

    // Assert
    expect(persons).toEqual([
      { name: 'Боб', imageUrl: 'https://img/bob.png' },
      { name: 'Алиса', imageUrl: 'https://img/alice.png' },
    ]);
    expect(referenceImages).toEqual([
      'https://img/bob.png',
      'https://img/alice.png',
    ]);
  });

  it('uses empty string as fallback when a mentioned character has no imageUrl', () => {
    // Arrange
    const scenario = 'кэрол идет';
    const characters = [{ name: 'Кэрол', imageUrl: null }] as never;

    // Act
    const { persons, referenceImages } = selectMentionedCharacters(
      scenario,
      characters,
    );

    // Assert
    expect(persons).toEqual([{ name: 'Кэрол', imageUrl: null }]);
    expect(referenceImages).toEqual(['']);
  });
});
