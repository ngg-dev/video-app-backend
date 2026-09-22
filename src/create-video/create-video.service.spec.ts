import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('src/ai-providers/deepseek/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

jest.mock('src/ai-providers/xai/xai.service', () => ({
  XaiService: jest.fn(),
}));

import { CreateVideoService } from './create-video.service';
import type { CreateRequestDto } from './dto/create-video.dto';
import type { XaiService } from 'src/ai-providers/xai/xai.service';
import type { StorageService } from 'src/storage/storage.service';
import type { CreateVideoCacheService } from './create-video-cache.service';
import type { CreateVideoPromptService } from './create-video-prompt.service';
import type { CharacterCollectionReaderService } from 'src/character-gallery/character-collection-reader.service';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

describe('CreateVideoService.createVideoPipe', () => {
  let createVideoPromptService: {
    buildScenePrompt: jest.Mock;
    buildVideoPrompt: jest.Mock;
  };
  let xaiService: { generateImage: jest.Mock; generateVideo: jest.Mock };
  let storageService: { uploadGeneratedFile: jest.Mock; upload: jest.Mock };
  let createVideoCacheService: { get: jest.Mock; set: jest.Mock };
  let characterCollectionReaderService: {
    loadCollectionWithCharacters: jest.Mock;
  };
  let service: CreateVideoService;

  const data: CreateRequestDto = {
    scenario: 'A hero walks',
    collectionId: 'collection-1',
  };

  beforeEach(() => {
    createVideoPromptService = {
      buildScenePrompt: jest.fn().mockResolvedValue('a prompt'),
      buildVideoPrompt: jest.fn().mockResolvedValue('a prompt'),
    };
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
      uploadGeneratedFile: jest.fn().mockResolvedValue({
        key: 'scenes/a.png',
        url: 'https://storage.example/scenes/a.png',
        etag: 'etag',
      }),
      upload: jest.fn(),
    };
    createVideoCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    characterCollectionReaderService = {
      loadCollectionWithCharacters: jest.fn().mockResolvedValue({
        collection: { id: 'collection-1', style: 'noir' },
        characters: [],
      }),
    };

    service = new CreateVideoService(
      createVideoPromptService as unknown as CreateVideoPromptService,
      xaiService as unknown as XaiService,
      storageService as unknown as StorageService,
      createVideoCacheService as unknown as CreateVideoCacheService,
      characterCollectionReaderService as unknown as CharacterCollectionReaderService,
    );
  });

  it('generates a fresh pair on a cache miss, uploads only the image, and writes to cache', async () => {
    const result = await service.createVideoPipe(data);

    expect(result.sceneVideoUrl).toBe('https://provider.example/video.mp4');
    expect(storageService.uploadGeneratedFile).toHaveBeenCalledTimes(1);
    const uploadedPrefixes = storageService.uploadGeneratedFile.mock.calls.map(
      (call: unknown[]) => String(call[1]),
    );
    for (const prefix of uploadedPrefixes) {
      expect(prefix).not.toBe('scene-videos');
    }
    expect(createVideoCacheService.set).toHaveBeenCalledTimes(1);
    expect(createVideoCacheService.set).toHaveBeenCalledWith(
      'a hero walks',
      'collection-1',
      result,
    );
  });

  it('returns the cached pair on a cache hit without calling reader, DeepSeek, xAI or S3', async () => {
    createVideoCacheService.get.mockResolvedValue({
      sceneImageUrl: 'https://cached/image.png',
      sceneVideoUrl: 'https://cached/video.mp4',
    });

    const result = await service.createVideoPipe(data);

    expect(result).toEqual({
      sceneImageUrl: 'https://cached/image.png',
      sceneVideoUrl: 'https://cached/video.mp4',
    });
    expect(
      characterCollectionReaderService.loadCollectionWithCharacters,
    ).not.toHaveBeenCalled();
    expect(createVideoPromptService.buildScenePrompt).not.toHaveBeenCalled();
    expect(createVideoPromptService.buildVideoPrompt).not.toHaveBeenCalled();
    expect(xaiService.generateImage).not.toHaveBeenCalled();
    expect(xaiService.generateVideo).not.toHaveBeenCalled();
    expect(storageService.uploadGeneratedFile).not.toHaveBeenCalled();
  });

  it('serves a cache hit regardless of the requested duration', async () => {
    // Arrange
    createVideoCacheService.get.mockResolvedValue({
      sceneImageUrl: 'https://cached/image.png',
      sceneVideoUrl: 'https://cached/video.mp4',
    });
    const requestData: CreateRequestDto = { ...data, duration: 12 };

    // Act
    const result = await service.createVideoPipe(requestData);

    // Assert
    expect(result).toEqual({
      sceneImageUrl: 'https://cached/image.png',
      sceneVideoUrl: 'https://cached/video.mp4',
    });
    expect(createVideoCacheService.get).toHaveBeenCalledWith(
      'a hero walks',
      'collection-1',
    );
    expect(xaiService.generateImage).not.toHaveBeenCalled();
    expect(xaiService.generateVideo).not.toHaveBeenCalled();
  });

  it('still returns a fresh pair when Redis is unavailable', async () => {
    createVideoCacheService.get.mockResolvedValue(null);
    createVideoCacheService.set.mockResolvedValue(undefined);

    const result = await service.createVideoPipe(data);

    expect(result.sceneVideoUrl).toBe('https://provider.example/video.mp4');
  });

  it('throws InternalServerErrorException when generateVideo returns no videoUrl, without writing to cache', async () => {
    // Arrange
    xaiService.generateVideo.mockResolvedValue({
      video: { uint8Array: new Uint8Array(), mediaType: 'video/mp4' },
      videoUrl: null,
    });

    // Act & Assert
    await expect(service.createVideoPipe(data)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(createVideoCacheService.set).not.toHaveBeenCalled();
  });

  it('applies the default aspect ratio when the request omits it', async () => {
    // Arrange
    // data has no aspectRatio (see top-level fixture)

    // Act
    await service.createVideoPipe(data);

    // Assert
    expect(xaiService.generateImage).toHaveBeenCalledTimes(1);
    const [firstCallArg] = xaiService.generateImage.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(firstCallArg).toMatchObject({ aspectRatio: '9:16' });
  });

  it('forwards an explicitly requested aspect ratio to the image provider', async () => {
    // Arrange
    const requestData: CreateRequestDto = {
      ...data,
      aspectRatio: VideoAspectRatio.Square,
    };

    // Act
    await service.createVideoPipe(requestData);

    // Assert
    expect(xaiService.generateImage).toHaveBeenCalledTimes(1);
    const [firstCallArg] = xaiService.generateImage.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(firstCallArg).toMatchObject({ aspectRatio: '1:1' });
  });

  it('reads from the cache independently of the requested aspect ratio', async () => {
    // Arrange
    const requestData: CreateRequestDto = {
      ...data,
      aspectRatio: VideoAspectRatio.Horizontal,
    };

    // Act
    await service.createVideoPipe(requestData);

    // Assert
    expect(createVideoCacheService.get).toHaveBeenCalledWith(
      'a hero walks',
      'collection-1',
    );
  });

  it('writes to the cache independently of the requested aspect ratio', async () => {
    // Arrange
    // data has no aspectRatio -> default should be written

    // Act
    const result = await service.createVideoPipe(data);

    // Assert
    expect(createVideoCacheService.set).toHaveBeenCalledTimes(1);
    expect(createVideoCacheService.set).toHaveBeenCalledWith(
      'a hero walks',
      'collection-1',
      result,
    );
  });

  it('applies the default duration when the request omits it', async () => {
    // Act
    await service.createVideoPipe(data);

    // Assert
    expect(xaiService.generateVideo).toHaveBeenCalledTimes(1);
    const [firstCallArg] = xaiService.generateVideo.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(firstCallArg).toMatchObject({ duration: 5 });
  });

  it('forwards an explicitly requested duration to the video provider and to the cache', async () => {
    // Arrange
    const requestData: CreateRequestDto = { ...data, duration: 12 };

    // Act
    const result = await service.createVideoPipe(requestData);

    // Assert
    expect(xaiService.generateVideo).toHaveBeenCalledTimes(1);
    const [firstCallArg] = xaiService.generateVideo.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(firstCallArg).toMatchObject({ duration: 12 });
    expect(createVideoCacheService.get).toHaveBeenCalledWith(
      'a hero walks',
      'collection-1',
    );
    expect(createVideoCacheService.set).toHaveBeenCalledWith(
      'a hero walks',
      'collection-1',
      result,
    );
  });

  it('delegates the image prompt build to the prompt service, forwarding the matched characters and style', async () => {
    // Arrange
    createVideoPromptService.buildScenePrompt.mockResolvedValue('scene prompt');
    characterCollectionReaderService.loadCollectionWithCharacters.mockResolvedValue(
      {
        collection: {
          id: 'collection-1',
          style: 'noir',
        },
        characters: [{ name: 'Bob', imageUrl: 'https://img/bob.png' }],
      },
    );

    // Act
    await service.createVideoPipe({
      scenario: 'Bob walks',
      collectionId: 'collection-1',
    });

    // Assert
    expect(createVideoPromptService.buildScenePrompt).toHaveBeenCalledTimes(1);
    expect(createVideoPromptService.buildScenePrompt).toHaveBeenCalledWith(
      'bob walks',
      ['Bob'],
      'noir',
      '9:16',
    );
    expect(xaiService.generateImage).toHaveBeenCalledWith({
      prompt: 'scene prompt',
      referenceImages: ['https://img/bob.png'],
      aspectRatio: '9:16',
    });
  });

  it('passes the aspect ratio to buildScenePrompt but not to buildVideoPrompt, and forwards the video prompt to the video provider', async () => {
    // Arrange
    const requestData: CreateRequestDto = {
      ...data,
      aspectRatio: VideoAspectRatio.Horizontal,
    };
    createVideoPromptService.buildVideoPrompt.mockResolvedValue('video prompt');

    // Act
    await service.createVideoPipe(requestData);

    // Assert
    expect(createVideoPromptService.buildScenePrompt).toHaveBeenCalledTimes(1);
    const scenePromptArgs = createVideoPromptService.buildScenePrompt.mock
      .calls[0] as unknown[];
    expect(scenePromptArgs[3]).toBe('16:9');

    expect(createVideoPromptService.buildVideoPrompt).toHaveBeenCalledTimes(1);
    const videoPromptArgs = createVideoPromptService.buildVideoPrompt.mock
      .calls[0] as unknown[];
    expect(videoPromptArgs).toEqual(['a hero walks', []]);
    expect(videoPromptArgs).not.toContain('16:9');

    expect(xaiService.generateVideo).toHaveBeenCalledWith({
      prompt: 'video prompt',
      referenceImageUrls: ['https://storage.example/scenes/a.png'],
      resolution: '720p',
      duration: 5,
    });
  });

  it('uploads via storageService.uploadGeneratedFile exactly once, and only for the image', async () => {
    // Arrange
    // storageService.uploadGeneratedFile resolves per the beforeEach fixture

    // Act
    const result = await service.createVideoPipe(data);

    // Assert
    expect(storageService.uploadGeneratedFile).toHaveBeenCalledTimes(1);
    expect(storageService.uploadGeneratedFile).toHaveBeenCalledWith(
      { uint8Array: new Uint8Array(), mediaType: 'image/png' },
      'scenes',
      'png',
    );
    expect(storageService.upload).not.toHaveBeenCalled();
    expect(result.sceneImageUrl).toBe('https://storage.example/scenes/a.png');
  });

  it('throws InternalServerErrorException when scene image generation fails, without uploading or building the video prompt', async () => {
    // Arrange
    xaiService.generateImage.mockResolvedValue(null);

    // Act & Assert
    await expect(service.createVideoPipe(data)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(storageService.uploadGeneratedFile).not.toHaveBeenCalled();
    expect(createVideoPromptService.buildVideoPrompt).not.toHaveBeenCalled();
    expect(createVideoCacheService.set).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the collection does not exist, without generating anything', async () => {
    // Arrange
    characterCollectionReaderService.loadCollectionWithCharacters.mockRejectedValue(
      new NotFoundException('Collection not found'),
    );

    // Act & Assert
    await expect(service.createVideoPipe(data)).rejects.toThrow(
      NotFoundException,
    );
    expect(xaiService.generateImage).not.toHaveBeenCalled();
    expect(xaiService.generateVideo).not.toHaveBeenCalled();
    expect(createVideoCacheService.set).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the collection has no style set, without generating anything', async () => {
    // Arrange
    characterCollectionReaderService.loadCollectionWithCharacters.mockRejectedValue(
      new BadRequestException('Collection has no style set'),
    );

    // Act & Assert
    await expect(service.createVideoPipe(data)).rejects.toThrow(
      BadRequestException,
    );
    expect(xaiService.generateImage).not.toHaveBeenCalled();
    expect(xaiService.generateVideo).not.toHaveBeenCalled();
    expect(createVideoCacheService.set).not.toHaveBeenCalled();
  });

  it('throws BadRequestException for preloaded collection/characters with no style set', async () => {
    // Arrange
    const preloadedCollection = { id: 'collection-1', style: null };

    // Act & Assert
    await expect(
      service.createVideoPipe({
        scenario: 'Bob walks',
        collectionId: 'collection-1',
        collection: preloadedCollection as never,
        characters: [],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(xaiService.generateImage).not.toHaveBeenCalled();
  });

  it('skips reader lookups and uses preloaded collection/characters when both are provided', async () => {
    // Arrange
    const preloadedCollection = { id: 'collection-1', style: 'noir' };
    const preloadedCharacters = [
      { name: 'Bob', imageUrl: 'https://img/bob.png' },
    ];

    // Act
    await service.createVideoPipe({
      scenario: 'Bob walks',
      collectionId: 'collection-1',
      collection: preloadedCollection as never,
      characters: preloadedCharacters as never,
    });

    // Assert
    expect(
      characterCollectionReaderService.loadCollectionWithCharacters,
    ).not.toHaveBeenCalled();
    expect(createVideoPromptService.buildScenePrompt).toHaveBeenCalledWith(
      'bob walks',
      ['Bob'],
      'noir',
      '9:16',
    );
  });

  it('does not pass an aspect ratio to the video generation call', async () => {
    // Arrange
    const requestData: CreateRequestDto = {
      ...data,
      aspectRatio: VideoAspectRatio.Horizontal,
    };

    // Act
    await service.createVideoPipe(requestData);

    // Assert
    const [videoCallArg] = xaiService.generateVideo.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(videoCallArg).not.toHaveProperty('aspectRatio');
    expect(videoCallArg.resolution).toBe('720p');
  });
});
