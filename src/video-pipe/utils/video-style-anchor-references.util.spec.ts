import { selectStyleAnchorReferenceImages } from './video-style-anchor-references.util';
import type { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';

describe('selectStyleAnchorReferenceImages', () => {
  it('includes only photos of characters mentioned in scenarios', () => {
    // Arrange
    const characters: CharacterItemEntity[] = [
      {
        id: '1',
        name: 'Alice',
        imageUrl: 'https://img/alice.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Bob',
        imageUrl: 'https://img/bob.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'Carol',
        imageUrl: 'https://img/carol.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const scenarios = ['alice walks', 'bob runs'];

    // Act
    const result = selectStyleAnchorReferenceImages(scenarios, characters);

    // Assert
    expect(result).toEqual(['https://img/alice.png', 'https://img/bob.png']);
  });

  it('does not include duplicates even if character appears in multiple scenarios', () => {
    // Arrange
    const characters: CharacterItemEntity[] = [
      {
        id: '1',
        name: 'Alice',
        imageUrl: 'https://img/alice.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const scenarios = ['alice sits', 'alice stands', 'alice again'];

    // Act
    const result = selectStyleAnchorReferenceImages(scenarios, characters);

    // Assert
    expect(result).toEqual(['https://img/alice.png']);
  });

  it('normalizes character names to lowercase for matching', () => {
    // Arrange
    const characters: CharacterItemEntity[] = [
      {
        id: '1',
        name: 'Alice',
        imageUrl: 'https://img/alice.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const scenarios = ['ALICE enters'];

    // Act
    const result = selectStyleAnchorReferenceImages(scenarios, characters);

    // Assert
    expect(result).toEqual(['https://img/alice.png']);
  });

  it('excludes characters with null or empty imageUrl', () => {
    // Arrange
    const characters: CharacterItemEntity[] = [
      {
        id: '1',
        name: 'Alice',
        imageUrl: null,
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Bob',
        imageUrl: '',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'Carol',
        imageUrl: 'https://img/carol.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const scenarios = ['alice, bob and carol'];

    // Act
    const result = selectStyleAnchorReferenceImages(scenarios, characters);

    // Assert
    expect(result).toEqual(['https://img/carol.png']);
  });

  it('preserves collection order, not scenario order', () => {
    // Arrange
    const characters: CharacterItemEntity[] = [
      {
        id: '1',
        name: 'Alice',
        imageUrl: 'https://img/alice.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Bob',
        imageUrl: 'https://img/bob.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const scenarios = ['bob first', 'alice second'];

    // Act
    const result = selectStyleAnchorReferenceImages(scenarios, characters);

    // Assert
    expect(result).toEqual(['https://img/alice.png', 'https://img/bob.png']);
  });

  it('returns empty array when no characters are mentioned', () => {
    // Arrange
    const characters: CharacterItemEntity[] = [
      {
        id: '1',
        name: 'Alice',
        imageUrl: 'https://img/alice.png',
        description: '',
        style: '',
        collectionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const scenarios = ['nobody here'];

    // Act
    const result = selectStyleAnchorReferenceImages(scenarios, characters);

    // Assert
    expect(result).toEqual([]);
  });
});
