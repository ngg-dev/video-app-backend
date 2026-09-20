import { BadRequestException, NotFoundException } from '@nestjs/common';
import { assertCollectionHasStyle } from './character-collection.util';

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
