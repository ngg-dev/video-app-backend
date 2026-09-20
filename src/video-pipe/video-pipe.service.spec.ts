jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('src/create-video/create-video.service', () => ({
  CreateVideoService: jest.fn(),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { VideoPipeService } from './video-pipe.service';
import type { VideoPipeRequestDto } from './dto/video-pipe.dto';
import type { CreateVideoService } from 'src/create-video/create-video.service';
import type {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';

describe('VideoPipeService.createVideoPipeline', () => {
  let createVideoService: { createVideoPipe: jest.Mock };
  let characterCollectionItemRepository: { findOne: jest.Mock };
  let characterItemRepository: { find: jest.Mock };
  let service: VideoPipeService;

  const collection = { id: 'collection-1', style: 'noir' };
  const characters = [{ name: 'Bob', imageUrl: 'https://img/bob.png' }];

  const data: VideoPipeRequestDto = {
    scenarios: ['s1', 's2', 's3', 's4', 's5'],
    collectionId: 'collection-1',
  };

  beforeEach(() => {
    createVideoService = {
      createVideoPipe: jest
        .fn()
        .mockImplementation((req: { scenario: string }) =>
          Promise.resolve({
            sceneImageUrl: `https://storage.example/${req.scenario}.png`,
            sceneVideoUrl: `https://storage.example/${req.scenario}.mp4`,
          }),
        ),
    };
    characterCollectionItemRepository = {
      findOne: jest.fn().mockResolvedValue(collection),
    };
    characterItemRepository = { find: jest.fn().mockResolvedValue(characters) };

    service = new VideoPipeService(
      createVideoService as unknown as CreateVideoService,
      characterCollectionItemRepository as unknown as Repository<CharacterCollectionItemEntity>,
      characterItemRepository as unknown as Repository<CharacterItemEntity>,
    );
  });

  it('fetches the collection and characters exactly once', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    expect(characterCollectionItemRepository.findOne).toHaveBeenCalledTimes(1);
    expect(characterCollectionItemRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'collection-1' },
    });
    expect(characterItemRepository.find).toHaveBeenCalledTimes(1);
    expect(characterItemRepository.find).toHaveBeenCalledWith({
      where: { collectionId: 'collection-1' },
    });
  });

  it('calls createVideoPipe once per scenario, forwarding the preloaded collection and characters', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    expect(createVideoService.createVideoPipe).toHaveBeenCalledTimes(5);
    for (const [index, scenario] of data.scenarios.entries()) {
      expect(createVideoService.createVideoPipe).toHaveBeenNthCalledWith(
        index + 1,
        {
          scenario,
          collectionId: 'collection-1',
          aspectRatio: '9:16',
          duration: 5,
          collection,
          characters,
        },
      );
    }
  });

  it('returns one response per scenario, in order', async () => {
    // Act
    const result = await service.createVideoPipeline(data);

    // Assert
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.sceneVideoUrl)).toEqual([
      'https://storage.example/s1.mp4',
      'https://storage.example/s2.mp4',
      'https://storage.example/s3.mp4',
      'https://storage.example/s4.mp4',
      'https://storage.example/s5.mp4',
    ]);
  });

  it('applies the default aspect ratio when the request omits it', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    const [firstCallArg] = createVideoService.createVideoPipe.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(firstCallArg).toMatchObject({ aspectRatio: '9:16' });
  });

  it('sets a 5 second duration on every scene by default', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    for (const call of createVideoService.createVideoPipe.mock.calls as [
      Record<string, unknown>,
    ][]) {
      expect(call[0]).toMatchObject({ duration: 5 });
    }
  });

  it('forwards an explicitly requested aspect ratio to every scene', async () => {
    // Arrange
    const requestData: VideoPipeRequestDto = {
      ...data,
      aspectRatio: '1:1' as never,
    };

    // Act
    await service.createVideoPipeline(requestData);

    // Assert
    for (const call of createVideoService.createVideoPipe.mock.calls as [
      Record<string, unknown>,
    ][]) {
      expect(call[0]).toMatchObject({ aspectRatio: '1:1' });
    }
  });

  it('throws NotFoundException when the collection does not exist, without calling createVideoPipe for any scene', async () => {
    // Arrange
    characterCollectionItemRepository.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      NotFoundException,
    );
    expect(createVideoService.createVideoPipe).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the collection has no style set, without calling createVideoPipe for any scene', async () => {
    // Arrange
    characterCollectionItemRepository.findOne.mockResolvedValue({
      id: 'collection-1',
      style: null,
    });

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      BadRequestException,
    );
    expect(createVideoService.createVideoPipe).not.toHaveBeenCalled();
  });

  it('propagates a rejection from any single scene (fail-fast)', async () => {
    // Arrange
    createVideoService.createVideoPipe
      .mockResolvedValueOnce({
        sceneImageUrl: 'https://storage.example/s1.png',
        sceneVideoUrl: 'https://storage.example/s1.mp4',
      })
      .mockRejectedValueOnce(new Error('scene 2 failed'));

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      'scene 2 failed',
    );
  });
});
