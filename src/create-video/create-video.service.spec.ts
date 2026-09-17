import { InternalServerErrorException } from '@nestjs/common';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('src/ai-providers/deepseek/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

jest.mock('src/ai-providers/xai/xai.service', () => ({
  XaiService: jest.fn(),
}));

import type { Repository } from 'typeorm';
import { CreateVideoService } from './create-video.service';
import type { CreateRequestDto } from './dto/create-video.dto';
import type { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import type { XaiService } from 'src/ai-providers/xai/xai.service';
import type { StorageService } from 'src/storage/storage.service';
import type { CreateVideoCacheService } from './create-video-cache.service';
import type {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';

describe('CreateVideoService.createVideoPipe', () => {
  let deepSeekService: { generate: jest.Mock };
  let xaiService: { generateImage: jest.Mock; generateVideo: jest.Mock };
  let storageService: { upload: jest.Mock };
  let createVideoCacheService: { get: jest.Mock; set: jest.Mock };
  let characterCollectionItemRepository: { findOne: jest.Mock };
  let characterItemRepository: { find: jest.Mock };
  let service: CreateVideoService;

  const data: CreateRequestDto = {
    scenario: 'A hero walks',
    collectionId: 'collection-1',
  };

  beforeEach(() => {
    deepSeekService = { generate: jest.fn().mockResolvedValue('a prompt') };
    xaiService = {
      generateImage: jest.fn().mockResolvedValue({
        uint8Array: new Uint8Array(),
        mediaType: 'image/png',
      }),
      generateVideo: jest.fn().mockResolvedValue({
        video: { uint8Array: new Uint8Array(), mediaType: 'video/mp4' },
        videoUrl: 'https://provider.example/video.mp4',
      }),
    };
    storageService = {
      upload: jest.fn().mockResolvedValue({
        key: 'scenes/a.png',
        url: 'https://storage.example/scenes/a.png',
        etag: 'etag',
      }),
    };
    createVideoCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    characterCollectionItemRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'collection-1', style: null }),
    };
    characterItemRepository = { find: jest.fn().mockResolvedValue([]) };

    service = new CreateVideoService(
      deepSeekService as unknown as DeepSeekService,
      xaiService as unknown as XaiService,
      storageService as unknown as StorageService,
      createVideoCacheService as unknown as CreateVideoCacheService,
      characterCollectionItemRepository as unknown as Repository<CharacterCollectionItemEntity>,
      characterItemRepository as unknown as Repository<CharacterItemEntity>,
    );
  });

  it('generates a fresh pair on a cache miss, uploads only the image, and writes to cache', async () => {
    const result = await service.createVideoPipe(data);

    expect(result.sceneVideoUrl).toBe('https://provider.example/video.mp4');
    expect(storageService.upload).toHaveBeenCalledTimes(1);
    const uploadedKeys = storageService.upload.mock.calls.map(
      (call: unknown[]) => String(call[0]),
    );
    for (const key of uploadedKeys) {
      expect(key).not.toContain('scene-videos/');
    }
    expect(createVideoCacheService.set).toHaveBeenCalledTimes(1);
    expect(createVideoCacheService.set).toHaveBeenCalledWith(
      'a hero walks',
      'collection-1',
      result,
    );
  });

  it('returns the cached pair on a cache hit without calling repositories, DeepSeek, xAI or S3', async () => {
    createVideoCacheService.get.mockResolvedValue({
      sceneImageUrl: 'https://cached/image.png',
      sceneVideoUrl: 'https://cached/video.mp4',
    });

    const result = await service.createVideoPipe(data);

    expect(result).toEqual({
      sceneImageUrl: 'https://cached/image.png',
      sceneVideoUrl: 'https://cached/video.mp4',
    });
    expect(characterCollectionItemRepository.findOne).not.toHaveBeenCalled();
    expect(characterItemRepository.find).not.toHaveBeenCalled();
    expect(deepSeekService.generate).not.toHaveBeenCalled();
    expect(xaiService.generateImage).not.toHaveBeenCalled();
    expect(xaiService.generateVideo).not.toHaveBeenCalled();
    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('still returns a fresh pair when Redis is unavailable', async () => {
    createVideoCacheService.get.mockResolvedValue(null);
    createVideoCacheService.set.mockResolvedValue(undefined);

    const result = await service.createVideoPipe(data);

    expect(result.sceneVideoUrl).toBe('https://provider.example/video.mp4');
  });

  it('throws InternalServerErrorException when generateVideo returns no videoUrl', async () => {
    xaiService.generateVideo.mockResolvedValue({
      video: { uint8Array: new Uint8Array(), mediaType: 'video/mp4' },
      videoUrl: null,
    });

    await expect(service.createVideoPipe(data)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
