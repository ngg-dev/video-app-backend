jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('./character-image.service', () => ({
  CharacterImageService: jest.fn(),
}));

import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { CharacterGalleryService } from './character-gallery.service';
import type { CharacterItemEntity } from './entities/character-item.entity';
import type { CharacterCollectionItemEntity } from './entities/character-item.entity';
import type { CharacterImageService } from './character-image.service';
import type { CreateCharacterDto } from './dto/create-character.dto';

describe('CharacterGalleryService', () => {
  let service: CharacterGalleryService;
  let characterItemRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let characterCollectionRepository: {
    findOne: jest.Mock;
  };
  let characterImageService: {
    generateCharacterImage: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    characterItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    characterCollectionRepository = {
      findOne: jest.fn(),
    };

    characterImageService = {
      generateCharacterImage: jest.fn(),
    };

    service = new CharacterGalleryService(
      characterItemRepository as unknown as Repository<CharacterItemEntity>,
      characterCollectionRepository as unknown as Repository<CharacterCollectionItemEntity>,
      characterImageService as unknown as CharacterImageService,
    );
  });

  describe('createCharacter', () => {
    it('creates character with resolved style from collection', async () => {
      // Arrange
      const dto: CreateCharacterDto = {
        name: 'Боб',
        prompt: 'p',
        collectionId: 'c1',
      };

      const mockCollection = {
        id: 'c1',
        style: 'noir',
      };

      characterCollectionRepository.findOne.mockResolvedValueOnce(
        mockCollection,
      );
      characterImageService.generateCharacterImage.mockResolvedValueOnce(
        'https://s3/x.png',
      );

      const createdEntity = {
        name: 'Боб',
        description: 'p',
        style: 'noir',
        collectionId: 'c1',
        imageUrl: 'https://s3/x.png',
      };

      characterItemRepository.create.mockReturnValueOnce(createdEntity);
      characterItemRepository.save.mockResolvedValueOnce(createdEntity);

      // Act
      const result = await service.createCharacter(dto);

      // Assert
      expect(characterCollectionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
      expect(characterImageService.generateCharacterImage).toHaveBeenCalledWith(
        'p',
        'noir',
      );
      expect(characterItemRepository.create).toHaveBeenCalledWith({
        name: 'Боб',
        description: 'p',
        style: 'noir',
        collectionId: 'c1',
        imageUrl: 'https://s3/x.png',
      });
      expect(characterItemRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdEntity);
    });

    it('throws NotFoundException when collection does not exist', async () => {
      // Arrange
      const dto: CreateCharacterDto = {
        name: 'Боб',
        prompt: 'p',
        collectionId: 'c1',
      };

      characterCollectionRepository.findOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.createCharacter(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        characterImageService.generateCharacterImage,
      ).not.toHaveBeenCalled();
      expect(characterItemRepository.create).not.toHaveBeenCalled();
      expect(characterItemRepository.save).not.toHaveBeenCalled();
    });
  });
});
