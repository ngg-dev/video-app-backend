jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('src/create-video/create-video.service', () => ({
  CreateVideoService: jest.fn(),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VideoPipeService } from './video-pipe.service';
import type { VideoPipeRequestDto } from './dto/video-pipe.dto';
import { VIDEO_PIPE_RESULT_KEY_PREFIX } from './constants/video-pipe.constant';
import type { CreateVideoService } from 'src/create-video/create-video.service';
import type { CreateVideoCacheService } from 'src/create-video/create-video-cache.service';
import type { VideoAssemblyService } from 'src/media/video-assembly.service';
import type { CharacterCollectionReaderService } from 'src/character-gallery/character-collection-reader.service';

describe('VideoPipeService.createVideoPipeline', () => {
  let createVideoService: { createVideoPipe: jest.Mock };
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
      createVideoPipe: jest
        .fn()
        .mockImplementation((req: { scenario: string }) =>
          Promise.resolve({
            sceneImageUrl: `https://storage.example/${req.scenario}.png`,
            sceneVideoUrl: `https://storage.example/${req.scenario}.mp4`,
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

  it('returns the concatenated video url', async () => {
    // Act
    const result = await service.createVideoPipeline(data);

    // Assert
    expect(result).toEqual({ videoUrl: 'https://storage.example/final.mp4' });
  });

  it('sends only sceneVideoUrl parts to the concat step, strictly in scenarios order', async () => {
    // Arrange: scenarios resolve in reverse completion order (s5 fastest, s1 slowest),
    // so the resulting order can only come from preserving request order, not completion order.
    const delays: Record<string, number> = {
      s1: 40,
      s2: 30,
      s3: 20,
      s4: 10,
      s5: 0,
    };
    createVideoService.createVideoPipe.mockImplementation(
      (req: { scenario: string }) =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                sceneImageUrl: `https://storage.example/${req.scenario}.png`,
                sceneVideoUrl: `https://storage.example/${req.scenario}.mp4`,
              }),
            delays[req.scenario],
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

  it('throws NotFoundException when the collection does not exist, without calling createVideoPipe/concat/delMany for any scene', async () => {
    // Arrange
    characterCollectionReaderService.loadCollectionWithCharacters.mockRejectedValue(
      new NotFoundException('Collection not found'),
    );

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      NotFoundException,
    );
    expect(createVideoService.createVideoPipe).not.toHaveBeenCalled();
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).not.toHaveBeenCalled();
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the collection has no style set, without calling createVideoPipe/concat/delMany for any scene', async () => {
    // Arrange
    characterCollectionReaderService.loadCollectionWithCharacters.mockRejectedValue(
      new BadRequestException('Collection has no style set'),
    );

    // Act & Assert
    await expect(service.createVideoPipeline(data)).rejects.toThrow(
      BadRequestException,
    );
    expect(createVideoService.createVideoPipe).not.toHaveBeenCalled();
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).not.toHaveBeenCalled();
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  it('propagates a rejection from any single scene (fail-fast) without reaching concat/delMany', async () => {
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
    expect(
      videoAssemblyService.concatNormalizedAndGetUrl,
    ).not.toHaveBeenCalled();
    expect(createVideoCacheService.delMany).not.toHaveBeenCalled();
  });

  describe('Test 7: createVideoPipe called N times in scenario order for N ≠ 5', () => {
    it.each([1, 2, 7])(
      'calls createVideoPipe %d time(s) for %d scenario(s)',
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
        expect(createVideoService.createVideoPipe).toHaveBeenCalledTimes(n);
        for (const [index, scenario] of scenarios.entries()) {
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

  describe('Test 9: Part order preserved for N = 7 even with reverse completion order', () => {
    it('preserves scenario order when parts resolve out of order', async () => {
      // Arrange
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

      createVideoService.createVideoPipe.mockImplementation(
        (req: { scenario: string }) =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  sceneImageUrl: `https://storage.example/${req.scenario}.png`,
                  sceneVideoUrl: `https://storage.example/${req.scenario}.mp4`,
                }),
              delays[req.scenario],
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
});
