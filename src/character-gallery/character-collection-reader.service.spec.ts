jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CharacterCollectionReaderService } from './character-collection-reader.service';
import type { Repository } from 'typeorm';
import type {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';

describe('CharacterCollectionReaderService', () => {
  let collectionRepository: { findOne: jest.Mock };
  let characterRepository: { find: jest.Mock };
  let service: CharacterCollectionReaderService;

  beforeEach(() => {
    collectionRepository = { findOne: jest.fn() };
    characterRepository = { find: jest.fn() };

    service = new CharacterCollectionReaderService(
      collectionRepository as unknown as Repository<CharacterCollectionItemEntity>,
      characterRepository as unknown as Repository<CharacterItemEntity>,
    );
  });

  describe('loadCollectionWithCharacters', () => {
    it('loads collection and characters in parallel', async () => {
      // Arrange
      const collectionId = 'c1';
      const collection = { id: 'c1', style: 'noir' };
      const characters = [{ name: 'Bob' }];

      collectionRepository.findOne.mockResolvedValue(collection);
      characterRepository.find.mockResolvedValue(characters);

      // Act
      const result = await service.loadCollectionWithCharacters(collectionId);

      // Assert
      expect(collectionRepository.findOne).toHaveBeenCalledTimes(1);
      expect(collectionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });

      expect(characterRepository.find).toHaveBeenCalledTimes(1);
      expect(characterRepository.find).toHaveBeenCalledWith({
        where: { collectionId: 'c1' },
      });

      expect(result).toEqual({
        collection,
        characters,
      });
    });
  });

  describe('loadCollectionWithCharacters validation', () => {
    it('throws NotFoundException when collection is not found', async () => {
      // Arrange
      collectionRepository.findOne.mockResolvedValue(null);
      characterRepository.find.mockResolvedValue([]);

      // Act & Assert
      await expect(service.loadCollectionWithCharacters('c1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when collection has no style', async () => {
      // Arrange
      const collection = { id: 'c1', style: null };
      collectionRepository.findOne.mockResolvedValue(collection);
      characterRepository.find.mockResolvedValue([]);

      // Act & Assert
      await expect(service.loadCollectionWithCharacters('c1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
