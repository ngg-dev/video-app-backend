/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access */

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('src/ai-providers/xai/xai.service', () => ({
  XaiService: jest.fn(),
}));

jest.mock('src/storage/storage.service', () => ({
  StorageService: jest.fn(),
}));

import { InternalServerErrorException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { CollectionStyleAnchorService } from './collection-style-anchor.service';
import type { XaiService } from 'src/ai-providers/xai/xai.service';
import type { StorageService } from 'src/storage/storage.service';
import type {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';

describe('CollectionStyleAnchorService', () => {
  let service: CollectionStyleAnchorService;
  let repositoryMock: {
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let xaiServiceMock: {
    generateImage: jest.Mock;
  };
  let storageServiceMock: {
    uploadGeneratedFile: jest.Mock;
  };

  beforeEach(() => {
    repositoryMock = {
      update: jest.fn(),
      findOne: jest.fn(),
    };
    xaiServiceMock = {
      generateImage: jest.fn(),
    };
    storageServiceMock = {
      uploadGeneratedFile: jest.fn(),
    };

    service = new CollectionStyleAnchorService(
      repositoryMock as any,
      xaiServiceMock as unknown as XaiService,
      storageServiceMock as unknown as StorageService,
    );
  });

  it('returns existing style anchor URL without generation', async () => {
    // Arrange
    const collection: CharacterCollectionItemEntity & { style: string } = {
      id: 'c1',
      style: 'noir',
      styleAnchorImageUrl: 'https://s3/anchor.png',
    } as any;
    const characters: CharacterItemEntity[] = [
      { imageUrl: 'https://img/hero.png' } as any,
    ];

    // Act
    const result = await service.ensureStyleAnchor(collection, characters);

    // Assert
    expect(result).toBe('https://s3/anchor.png');
    expect(xaiServiceMock.generateImage).not.toHaveBeenCalled();
    expect(storageServiceMock.uploadGeneratedFile).not.toHaveBeenCalled();
    expect(repositoryMock.update).not.toHaveBeenCalled();
  });

  it('generates and saves style anchor with character photos and description', async () => {
    // Arrange
    const collection: CharacterCollectionItemEntity & { style: string } = {
      id: 'c1',
      style: 'noir',
      styleAnchorImageUrl: null,
      styleDescription: 'flat colors',
    } as any;
    const characters: CharacterItemEntity[] = [
      { imageUrl: 'a.png' } as any,
      { imageUrl: 'b.png' } as any,
      { imageUrl: null } as any,
    ];
    const generatedImage = Buffer.from('fake-image');
    xaiServiceMock.generateImage.mockResolvedValue(generatedImage);
    storageServiceMock.uploadGeneratedFile.mockResolvedValue({
      url: 'https://s3/new.png',
    });
    repositoryMock.update.mockResolvedValue({ affected: 1 });

    // Act
    const result = await service.ensureStyleAnchor(collection, characters);

    // Assert
    expect(xaiServiceMock.generateImage).toHaveBeenCalledTimes(1);
    const [callArgs] = xaiServiceMock.generateImage.mock.calls[0];
    expect(callArgs.referenceImages).toEqual(['a.png', 'b.png']);
    expect(callArgs.prompt).toContain('noir');
    expect(callArgs.prompt).toContain('flat colors');
    expect(storageServiceMock.uploadGeneratedFile).toHaveBeenCalledWith(
      generatedImage,
      expect.any(String),
    );
    expect(result).toBe('https://s3/new.png');
  });

  it('uses conditional update with IsNull() to prevent race condition', async () => {
    // Arrange
    const collection: CharacterCollectionItemEntity & { style: string } = {
      id: 'c1',
      style: 'noir',
      styleAnchorImageUrl: null,
      styleDescription: 'flat colors',
    } as any;
    const characters: CharacterItemEntity[] = [{ imageUrl: 'a.png' } as any];
    xaiServiceMock.generateImage.mockResolvedValue(Buffer.from('image'));
    storageServiceMock.uploadGeneratedFile.mockResolvedValue({
      url: 'https://s3/new.png',
    });
    repositoryMock.update.mockResolvedValue({ affected: 1 });

    // Act
    await service.ensureStyleAnchor(collection, characters);

    // Assert
    expect(repositoryMock.update).toHaveBeenCalledWith(
      { id: 'c1', styleAnchorImageUrl: IsNull() },
      { styleAnchorImageUrl: 'https://s3/new.png' },
    );
  });

  it('re-reads the collection URL when losing a race condition', async () => {
    // Arrange
    const collection: CharacterCollectionItemEntity & { style: string } = {
      id: 'c1',
      style: 'noir',
      styleAnchorImageUrl: null,
      styleDescription: 'flat colors',
    } as any;
    const characters: CharacterItemEntity[] = [{ imageUrl: 'a.png' } as any];
    xaiServiceMock.generateImage.mockResolvedValue(Buffer.from('image'));
    storageServiceMock.uploadGeneratedFile.mockResolvedValue({
      url: 'https://s3/new.png',
    });
    repositoryMock.update.mockResolvedValue({ affected: 0 });
    repositoryMock.findOne.mockResolvedValue({
      id: 'c1',
      styleAnchorImageUrl: 'https://s3/winner.png',
    });

    // Act
    const result = await service.ensureStyleAnchor(collection, characters);

    // Assert
    expect(result).toBe('https://s3/winner.png');
    expect(repositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'c1' },
    });
  });

  it('returns null when there are no character photos', async () => {
    // Arrange
    const collection: CharacterCollectionItemEntity & { style: string } = {
      id: 'c1',
      style: 'noir',
      styleAnchorImageUrl: null,
    } as any;
    const characters: CharacterItemEntity[] = [];

    // Act
    const result = await service.ensureStyleAnchor(collection, characters);

    // Assert
    expect(result).toBe(null);
    expect(xaiServiceMock.generateImage).not.toHaveBeenCalled();
    expect(storageServiceMock.uploadGeneratedFile).not.toHaveBeenCalled();
    expect(repositoryMock.update).not.toHaveBeenCalled();
  });

  it('throws InternalServerErrorException when xAI returns empty result', async () => {
    // Arrange
    const collection: CharacterCollectionItemEntity & { style: string } = {
      id: 'c1',
      style: 'noir',
      styleAnchorImageUrl: null,
    } as any;
    const characters: CharacterItemEntity[] = [{ imageUrl: 'a.png' } as any];
    xaiServiceMock.generateImage.mockResolvedValue(null);

    // Act & Assert
    await expect(
      service.ensureStyleAnchor(collection, characters),
    ).rejects.toThrow(InternalServerErrorException);
    expect(xaiServiceMock.generateImage).toHaveBeenCalledTimes(1);
    expect(storageServiceMock.uploadGeneratedFile).not.toHaveBeenCalled();
    expect(repositoryMock.update).not.toHaveBeenCalled();
  });

  it('throws InternalServerErrorException when race lost and re-read returns empty', async () => {
    // Arrange
    const collection: CharacterCollectionItemEntity & { style: string } = {
      id: 'c1',
      style: 'noir',
      styleAnchorImageUrl: null,
    } as any;
    const characters: CharacterItemEntity[] = [{ imageUrl: 'a.png' } as any];
    xaiServiceMock.generateImage.mockResolvedValue(Buffer.from('image'));
    storageServiceMock.uploadGeneratedFile.mockResolvedValue({
      url: 'https://s3/new.png',
    });
    repositoryMock.update.mockResolvedValue({ affected: 0 });
    repositoryMock.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(
      service.ensureStyleAnchor(collection, characters),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
