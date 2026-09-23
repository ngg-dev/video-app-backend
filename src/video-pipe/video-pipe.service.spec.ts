jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('src/create-video/create-video.service', () => ({
  CreateVideoService: jest.fn(),
}));

jest.mock('src/ai-providers/xai/xai.service', () => ({
  XaiService: jest.fn(),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VideoPipeService } from './video-pipe.service';
import type { VideoPipeRequestDto } from './dto/video-pipe.dto';
import { VIDEO_PIPE_RESULT_KEY_PREFIX } from './constants/video-pipe.constant';
import type { CreateVideoService } from 'src/create-video/create-video.service';
import type { PreparedSceneImage } from 'src/create-video/types/create-video.types';
import type { CreateVideoCacheService } from 'src/create-video/create-video-cache.service';
import type { VideoAssemblyService } from 'src/media/video-assembly.service';
import type { CharacterCollectionReaderService } from 'src/character-gallery/character-collection-reader.service';
import type { CollectionStyleAnchorService } from 'src/character-gallery/collection-style-anchor.service';

interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function createDeferred<T>(): DeferredPromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('VideoPipeService.createVideoPipeline', () => {
  let createVideoService: {
    prepareSceneImage: jest.Mock;
    renderSceneVideo: jest.Mock;
  };
  let videoAssemblyService: { concatNormalizedAndGetUrl: jest.Mock };
  let createVideoCacheService: { delMany: jest.Mock };
  let characterCollectionReaderService: {
    loadCollectionWithCharacters: jest.Mock;
  };
  let service: VideoPipeService;

  const collection = { id: 'collection-1', style: 'noir' };
  const characters = [{ name: 'Bob', imageUrl: 'https://img/bob.png' }];

  const data: VideoPipeRequestDto = {
    scenarios: ['s1', 's2', 's3', 's4', 's5'],
    collectionId: 'collection-1',
  };

  beforeEach(() => {
    createVideoService = {
      prepareSceneImage: jest
        .fn()
        .mockImplementation((req: { scenario: string }) =>
          Promise.resolve({
            scenario: req.scenario,
            collectionId: 'collection-1',
            duration: 5,
            characterNames: [],
            sceneImageUrl: `https://storage.example/${req.scenario}.png`,
          }),
        ),
      renderSceneVideo: jest
        .fn()
        .mockImplementation((prepared: PreparedSceneImage) =>
          Promise.resolve({
            sceneImageUrl: prepared.sceneImageUrl,
            sceneVideoUrl: `https://storage.example/${prepared.scenario}.mp4`,
          }),
        ),
    };
    videoAssemblyService = {
      concatNormalizedAndGetUrl: jest.fn().mockResolvedValue({
        url: 'https://storage.example/final.mp4',
        key: 'videos/video-pipe/final.mp4',
      }),
    };
    createVideoCacheService = {
      delMany: jest.fn().mockResolvedValue(undefined),
    };
    characterCollectionReaderService = {
      loadCollectionWithCharacters: jest.fn().mockResolvedValue({
        collection,
        characters,
      }),
    };

    service = new VideoPipeService(
      createVideoService as unknown as CreateVideoService,
      videoAssemblyService as unknown as VideoAssemblyService,
      createVideoCacheService as unknown as CreateVideoCacheService,
      characterCollectionReaderService as unknown as CharacterCollectionReaderService,
      {
        ensureStyleAnchor: jest.fn().mockResolvedValue(null),
      } as unknown as CollectionStyleAnchorService,
    );
  });

  it('fetches the collection and characters exactly once', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    expect(
      characterCollectionReaderService.loadCollectionWithCharacters,
    ).toHaveBeenCalledTimes(1);
    expect(
      characterCollectionReaderService.loadCollectionWithCharacters,
    ).toHaveBeenCalledWith('collection-1');
  });

  it('calls prepareSceneImage once per scenario, forwarding the preloaded collection and characters', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    expect(createVideoService.prepareSceneImage).toHaveBeenCalledTimes(5);
    for (const [index, scenario] of data.scenarios.entries()) {
      expect(createVideoService.prepareSceneImage).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({
          scenario,
          collectionId: 'collection-1',
          aspectRatio: '9:16',
          duration: 5,
          collection: { ...collection, styleAnchorImageUrl: null },
          characters,
        }),
      );
    }
  });

  it('returns the concatenated video url', async () => {
    // Act
    const result = await service.createVideoPipeline(data);

    // Assert
    expect(result).toEqual({ videoUrl: 'https://storage.example/final.mp4' });
  });

  it('sends only sceneVideoUrl parts to the concat step, strictly in scenarios order', async () => {
    // Arrange: video generation resolves in reverse completion order (s5
    // fastest, s1 slowest), so the resulting order can only come from
    // preserving request order, not completion order.
    const delays: Record<string, number> = {
      s1: 40,
      s2: 30,
      s3: 20,
      s4: 10,
      s5: 0,
    };
    createVideoService.renderSceneVideo.mockImplementation(
      (prepared: PreparedSceneImage) =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                sceneImageUrl: prepared.sceneImageUrl,
                sceneVideoUrl: `https://storage.example/${prepared.scenario}.mp4`,
              }),
            delays[prepared.scenario],
          ),
        ),
    );

    // Act
    await service.createVideoPipeline(data);

    // Assert
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).toHaveBeenCalledTimes(1);
    const [partUrls] = videoAssemblyService.concatNormalizedAndGetUrl.mock
      .calls[0] as [string[]];
    expect(partUrls).toEqual([
      'https://storage.example/s1.mp4',
      'https://storage.example/s2.mp4',
      'https://storage.example/s3.mp4',
      'https://storage.example/s4.mp4',
      'https://storage.example/s5.mp4',
    ]);
  });

  it('derives the concat target resolution from the requested aspect ratio', async () => {
    // Arrange
    const requestData: VideoPipeRequestDto = {
      ...data,
      aspectRatio: '16:9' as never,
    };

    // Act
    await service.createVideoPipeline(requestData);

    // Assert
    const [, options] = videoAssemblyService.concatNormalizedAndGetUrl.mock
      .calls[0] as [string[], { size: { width: number; height: number } }];
    expect(options.size).toEqual({ width: 1280, height: 720 });
  });

  it('normalizes the concat target resolution to the default 9:16 when aspectRatio is omitted', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    const [, options] = videoAssemblyService.concatNormalizedAndGetUrl.mock
      .calls[0] as [string[], { size: { width: number; height: number } }];
    expect(options.size).toEqual({ width: 720, height: 1280 });
  });

  it('uploads the result under the video-pipe key prefix', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    const [, options] = videoAssemblyService.concatNormalizedAndGetUrl.mock
      .calls[0] as [string[], { keyPrefix: string }];
    expect(options.keyPrefix).toBe(VIDEO_PIPE_RESULT_KEY_PREFIX);
  });

  it('clears the parts cache after a successful upload, exactly for the request input', async () => {
    // Arrange
    const requestData: VideoPipeRequestDto = {
      ...data,
      aspectRatio: '1:1' as never,
    };

    // Act
    await service.createVideoPipeline(requestData);

    // Assert
    expect(createVideoCacheService.delMany).toHaveBeenCalledTimes(1);
    expect(createVideoCacheService.delMany).toHaveBeenCalledWith(
      requestData.scenarios,
      'collection-1',
    );
  });

  it('clears the parts cache only after concat and upload have completed', async () => {
    // Arrange
    const callOrder: string[] = [];
    videoAssemblyService.concatNormalizedAndGetUrl.mockImplementation(() => {
      callOrder.push('concat');
      return Promise.resolve({
        url: 'https://storage.example/final.mp4',
        key: 'videos/video-pipe/final.mp4',
      });
    });
    createVideoCacheService.delMany.mockImplementation(() => {
      callOrder.push('delMany');
      return Promise.resolve(undefined);
    });

    // Act
    await service.createVideoPipeline(data);

    // Assert
    expect(callOrder).toEqual(['concat', 'delMany']);
  });

  it('propagates a concat/upload failure and leaves the parts cache untouched', async () => {
    // Arrange
    videoAssemblyService.concatNormalizedAndGetUrl.mockRejectedValue(
      new Error('ffmpeg failed'),
    );

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      'ffmpeg failed',
    );
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  it('applies the default aspect ratio when the request omits it', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    const [firstCallArg] = createVideoService.prepareSceneImage.mock
      .calls[0] as [Record<string, unknown>];
    expect(firstCallArg).toMatchObject({ aspectRatio: '9:16' });
  });

  it('sets a 5 second duration on every scene by default', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    for (const call of createVideoService.prepareSceneImage.mock.calls as [
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
    for (const call of createVideoService.prepareSceneImage.mock.calls as [
      Record<string, unknown>,
    ][]) {
      expect(call[0]).toMatchObject({ aspectRatio: '1:1' });
    }
  });

  it('throws NotFoundException when the collection does not exist, without calling prepareSceneImage/renderSceneVideo/concat/delMany for any scene', async () => {
    // Arrange
    characterCollectionReaderService.loadCollectionWithCharacters.mockRejectedValue(
      new NotFoundException('Collection not found'),
    );

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      NotFoundException,
    );
    expect(createVideoService.prepareSceneImage).not.toHaveBeenCalled();
    expect(createVideoService.renderSceneVideo).not.toHaveBeenCalled();
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).not.toHaveBeenCalled();
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the collection has no style set, without calling prepareSceneImage/renderSceneVideo/concat/delMany for any scene', async () => {
    // Arrange
    characterCollectionReaderService.loadCollectionWithCharacters.mockRejectedValue(
      new BadRequestException('Collection has no style set'),
    );

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      BadRequestException,
    );
    expect(createVideoService.prepareSceneImage).not.toHaveBeenCalled();
    expect(createVideoService.renderSceneVideo).not.toHaveBeenCalled();
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).not.toHaveBeenCalled();
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  it('propagates a rejection from any single scene (fail-fast) without reaching concat/delMany', async () => {
    // Arrange
    createVideoService.renderSceneVideo
      .mockResolvedValueOnce({
        sceneImageUrl: 'https://storage.example/s1.png',
        sceneVideoUrl: 'https://storage.example/s1.mp4',
      })
      .mockRejectedValueOnce(new Error('scene 2 failed'));

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      'scene 2 failed',
    );
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).not.toHaveBeenCalled();
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  describe('Test 7: prepareSceneImage called N times in scenario order for N ≠ 5', () => {
    it.each([1, 2, 7])(
      'calls prepareSceneImage %d time(s) for %d scenario(s)',
      async (n: number) => {
        // Arrange
        const scenarios = Array.from({ length: n }, (_, i) => `s${i + 1}`);
        const requestData: VideoPipeRequestDto = {
          scenarios,
          collectionId: 'collection-1',
        };

        // Act
        await service.createVideoPipeline(requestData);

        // Assert
        expect(createVideoService.prepareSceneImage).toHaveBeenCalledTimes(n);
        for (const [index, scenario] of scenarios.entries()) {
          expect(createVideoService.prepareSceneImage).toHaveBeenNthCalledWith(
            index + 1,
            expect.objectContaining({
              scenario,
              collectionId: 'collection-1',
              aspectRatio: '9:16',
              duration: 5,
              collection: { ...collection, styleAnchorImageUrl: null },
              characters,
            }),
          );
        }
      },
    );
  });

  describe('Test 8: Exactly N parts go to concat in scenario order for N ≠ 5', () => {
    it.each([1, 2, 7])(
      'sends %d part(s) to concat for %d scenario(s)',
      async (n: number) => {
        // Arrange
        const scenarios = Array.from({ length: n }, (_, i) => `s${i + 1}`);
        const requestData: VideoPipeRequestDto = {
          scenarios,
          collectionId: 'collection-1',
        };

        // Act
        await service.createVideoPipeline(requestData);

        // Assert
        expect(
          videoAssemblyService.concatNormalizedAndGetUrl,
        ).toHaveBeenCalledTimes(1);
        const [partUrls] = videoAssemblyService.concatNormalizedAndGetUrl.mock
          .calls[0] as [string[]];
        const expectedUrls = scenarios.map(
          (s) => `https://storage.example/${s}.mp4`,
        );
        expect(partUrls).toEqual(expectedUrls);
        expect(partUrls).toHaveLength(n);
      },
    );
  });

  describe('Test 9: Part order preserved for N = 7 even with reverse video completion order', () => {
    it('preserves scenario order when video renders resolve out of order', async () => {
      // Arrange - images resolve instantly (chain), only the parallel video
      // step resolves out of order.
      const scenarios = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
      const requestData: VideoPipeRequestDto = {
        scenarios,
        collectionId: 'collection-1',
      };

      const delays: Record<string, number> = {
        s1: 70,
        s2: 60,
        s3: 50,
        s4: 40,
        s5: 30,
        s6: 20,
        s7: 0,
      };

      createVideoService.renderSceneVideo.mockImplementation(
        (prepared: PreparedSceneImage) =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  sceneImageUrl: prepared.sceneImageUrl,
                  sceneVideoUrl: `https://storage.example/${prepared.scenario}.mp4`,
                }),
              delays[prepared.scenario],
            ),
          ),
      );

      // Act
      await service.createVideoPipeline(requestData);

      // Assert
      expect(
        videoAssemblyService.concatNormalizedAndGetUrl,
      ).toHaveBeenCalledTimes(1);
      const [partUrls] = videoAssemblyService.concatNormalizedAndGetUrl.mock
        .calls[0] as [string[]];
      expect(partUrls).toEqual([
        'https://storage.example/s1.mp4',
        'https://storage.example/s2.mp4',
        'https://storage.example/s3.mp4',
        'https://storage.example/s4.mp4',
        'https://storage.example/s5.mp4',
        'https://storage.example/s6.mp4',
        'https://storage.example/s7.mp4',
      ]);
    });
  });

  describe('Test 10: Cache cleared for input scenarios when N ≠ 5', () => {
    it('clears cache exactly with input scenarios for N = 2', async () => {
      // Arrange
      const scenarios = ['s1', 's2'];
      const requestData: VideoPipeRequestDto = {
        scenarios,
        collectionId: 'collection-1',
      };

      // Act
      await service.createVideoPipeline(requestData);

      // Assert
      expect(createVideoCacheService.delMany).toHaveBeenCalledTimes(1);
      expect(createVideoCacheService.delMany).toHaveBeenCalledWith(
        scenarios,
        'collection-1',
      );
    });
  });

  it('passes styleReferenceImageUrl as undefined for the first scene', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    const [firstCall] = createVideoService.prepareSceneImage.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(firstCall.styleReferenceImageUrl).toBeUndefined();
  });

  it('passes the sceneImageUrl of scene N-1 as styleReferenceImageUrl to scene N', async () => {
    // Act
    await service.createVideoPipeline(data);

    // Assert
    for (let i = 1; i < data.scenarios.length; i++) {
      const call = createVideoService.prepareSceneImage.mock.calls[i] as [
        Record<string, unknown>,
      ];
      expect(call[0].styleReferenceImageUrl).toBe(
        `https://storage.example/s${i}.png`,
      );
    }
  });

  it('does not start image generation for scene N+1 until scene N image is ready', async () => {
    // Arrange
    const s1Deferred = createDeferred<PreparedSceneImage>();
    createVideoService.prepareSceneImage.mockImplementation(
      (req: { scenario: string }) => {
        if (req.scenario === 's1') {
          return s1Deferred.promise;
        }
        return Promise.resolve({
          scenario: req.scenario,
          collectionId: 'collection-1',
          duration: 5,
          characterNames: [],
          sceneImageUrl: `https://storage.example/${req.scenario}.png`,
        });
      },
    );

    // Act
    const pipelinePromise = service.createVideoPipeline(data);
    await Promise.resolve();
    await Promise.resolve();

    // Assert - only scene 1's image generation has started
    expect(createVideoService.prepareSceneImage).toHaveBeenCalledTimes(1);

    // Resolve scene 1's image and flush
    s1Deferred.resolve({
      scenario: 's1',
      collectionId: 'collection-1',
      duration: 5,
      characterNames: [],
      sceneImageUrl: 'https://storage.example/s1.png',
    });
    await Promise.resolve();

    // Assert - scene 2's image generation has now started
    expect(createVideoService.prepareSceneImage).toHaveBeenCalledTimes(2);

    await pipelinePromise;
  });

  it('starts video generation for scene N before image N+1 is ready', async () => {
    // Arrange
    const s2Deferred = createDeferred<PreparedSceneImage>();
    createVideoService.prepareSceneImage.mockImplementation(
      (req: { scenario: string }) => {
        if (req.scenario === 's2') {
          return s2Deferred.promise;
        }
        return Promise.resolve({
          scenario: req.scenario,
          collectionId: 'collection-1',
          duration: 5,
          characterNames: [],
          sceneImageUrl: `https://storage.example/${req.scenario}.png`,
        });
      },
    );

    // Act
    const pipelinePromise = service.createVideoPipeline(data);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Assert - scene 1's video generation has already started, while scene 2's
    // image is not ready yet
    expect(createVideoService.renderSceneVideo).toHaveBeenCalledWith(
      expect.objectContaining({ scenario: 's1' }),
    );
    expect(createVideoService.prepareSceneImage).toHaveBeenCalledTimes(2);

    // Clean up
    s2Deferred.resolve({
      scenario: 's2',
      collectionId: 'collection-1',
      duration: 5,
      characterNames: [],
      sceneImageUrl: 'https://storage.example/s2.png',
    });
    await pipelinePromise;
  });

  it('fails fast on prepareSceneImage error and does not start subsequent images', async () => {
    // Arrange
    createVideoService.prepareSceneImage
      .mockResolvedValueOnce({
        scenario: 's1',
        collectionId: 'collection-1',
        duration: 5,
        characterNames: [],
        sceneImageUrl: 'https://storage.example/s1.png',
      })
      .mockRejectedValueOnce(new Error('image 2 failed'));

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      'image 2 failed',
    );
    expect(createVideoService.prepareSceneImage).toHaveBeenCalledTimes(2);
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).not.toHaveBeenCalled();
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  it('passes the sceneImageUrl from a cached scene as styleReferenceImageUrl to the next scene', async () => {
    // Arrange
    createVideoService.prepareSceneImage
      .mockResolvedValueOnce({
        scenario: 's1',
        collectionId: 'collection-1',
        duration: 5,
        characterNames: [],
        sceneImageUrl: 'https://storage.example/cached-s1.png',
        cachedSceneVideoUrl: 'https://storage.example/cached-s1.mp4',
      })
      .mockImplementation((req: { scenario: string }) =>
        Promise.resolve({
          scenario: req.scenario,
          collectionId: 'collection-1',
          duration: 5,
          characterNames: [],
          sceneImageUrl: `https://storage.example/${req.scenario}.png`,
        }),
      );

    // Act
    await service.createVideoPipeline(data);

    // Assert
    const secondCall = createVideoService.prepareSceneImage.mock.calls[1] as [
      Record<string, unknown>,
    ];
    expect(secondCall[0].styleReferenceImageUrl).toBe(
      'https://storage.example/cached-s1.png',
    );
  });

  it('resolves style anchor exactly once at the beginning', async () => {
    // Arrange
    const ensureStyleAnchorMock = jest
      .fn()
      .mockResolvedValue('https://s3/anchor.png');
    service = new VideoPipeService(
      createVideoService as unknown as CreateVideoService,
      videoAssemblyService as unknown as VideoAssemblyService,
      createVideoCacheService as unknown as CreateVideoCacheService,
      characterCollectionReaderService as unknown as CharacterCollectionReaderService,
      {
        ensureStyleAnchor: ensureStyleAnchorMock,
      } as unknown as CollectionStyleAnchorService,
    );

    // Act
    await service.createVideoPipeline(data);

    // Assert
    expect(ensureStyleAnchorMock).toHaveBeenCalledTimes(1);
    expect(ensureStyleAnchorMock).toHaveBeenCalledWith(collection, characters);
    // Verify ensureStyleAnchor was called before first prepareSceneImage
    expect(ensureStyleAnchorMock.mock.invocationCallOrder[0]).toBeLessThan(
      createVideoService.prepareSceneImage.mock.invocationCallOrder[0],
    );
  });

  it('passes style anchor to first scene without N-1', async () => {
    // Arrange
    const ensureStyleAnchorMock = jest
      .fn()
      .mockResolvedValue('https://s3/anchor.png');
    service = new VideoPipeService(
      createVideoService as unknown as CreateVideoService,
      videoAssemblyService as unknown as VideoAssemblyService,
      createVideoCacheService as unknown as CreateVideoCacheService,
      characterCollectionReaderService as unknown as CharacterCollectionReaderService,
      {
        ensureStyleAnchor: ensureStyleAnchorMock,
      } as unknown as CollectionStyleAnchorService,
    );

    // Act
    await service.createVideoPipeline(data);

    // Assert
    const firstCall = createVideoService.prepareSceneImage.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(firstCall[0].collection).toMatchObject({
      styleAnchorImageUrl: 'https://s3/anchor.png',
    });
    expect(firstCall[0].styleReferenceImageUrl).toBeUndefined();
  });

  it('passes style anchor and N-1 reference to subsequent scenes', async () => {
    // Arrange
    const ensureStyleAnchorMock = jest
      .fn()
      .mockResolvedValue('https://s3/anchor.png');
    service = new VideoPipeService(
      createVideoService as unknown as CreateVideoService,
      videoAssemblyService as unknown as VideoAssemblyService,
      createVideoCacheService as unknown as CreateVideoCacheService,
      characterCollectionReaderService as unknown as CharacterCollectionReaderService,
      {
        ensureStyleAnchor: ensureStyleAnchorMock,
      } as unknown as CollectionStyleAnchorService,
    );

    // Act
    await service.createVideoPipeline(data);

    // Assert
    for (let i = 1; i < data.scenarios.length; i++) {
      const call = createVideoService.prepareSceneImage.mock.calls[i] as [
        Record<string, unknown>,
      ];
      expect(call[0].collection).toMatchObject({
        styleAnchorImageUrl: 'https://s3/anchor.png',
      });
      expect(call[0].styleReferenceImageUrl).toBe(
        `https://storage.example/s${i}.png`,
      );
    }
  });

  it('passes null style anchor when no characters', async () => {
    // Arrange
    const ensureStyleAnchorMock = jest.fn().mockResolvedValue(null);
    service = new VideoPipeService(
      createVideoService as unknown as CreateVideoService,
      videoAssemblyService as unknown as VideoAssemblyService,
      createVideoCacheService as unknown as CreateVideoCacheService,
      characterCollectionReaderService as unknown as CharacterCollectionReaderService,
      {
        ensureStyleAnchor: ensureStyleAnchorMock,
      } as unknown as CollectionStyleAnchorService,
    );

    // Act
    await service.createVideoPipeline(data);

    // Assert
    for (const call of createVideoService.prepareSceneImage.mock.calls as [
      Record<string, unknown>,
    ][]) {
      expect(call[0].collection).toMatchObject({
        styleAnchorImageUrl: null,
      });
    }
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).toHaveBeenCalledTimes(1);
  });
});
