import { runSceneImageChain } from './scene-chain.util';

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

describe('runSceneImageChain', () => {
  it('does not start image i+1 until image i has resolved', async () => {
    // Arrange
    const generateImageCalls: number[] = [];
    const imageDeferred = [
      createDeferred<{ url: string }>(),
      createDeferred<{ url: string }>(),
      createDeferred<{ url: string }>(),
    ];

    const generateImage = jest.fn().mockImplementation((index: number) => {
      generateImageCalls.push(index);
      return imageDeferred[index].promise;
    });

    const generateVideo = jest.fn().mockResolvedValue({ videoUrl: 'video' });

    // Act
    const chainPromise = runSceneImageChain(3, generateImage, generateVideo);

    // Assert (initial state)
    await Promise.resolve(); // Flush microtasks
    expect(generateImageCalls).toEqual([0]);

    // Resolve image 0 and flush
    imageDeferred[0].resolve({ url: 'img-0' });
    await Promise.resolve();
    expect(generateImageCalls).toEqual([0, 1]);

    // Clean up
    imageDeferred[1].resolve({ url: 'img-1' });
    imageDeferred[2].resolve({ url: 'img-2' });
    await chainPromise;
  });

  it('passes previous image result to the next generateImage call', async () => {
    // Arrange
    const generateImageArgs: Array<[number, unknown]> = [];

    const generateImage = jest
      .fn()
      .mockImplementation((index: number, previous: unknown) => {
        generateImageArgs.push([index, previous]);
        return Promise.resolve({ url: `img-${index}` });
      });

    const generateVideo = jest.fn().mockResolvedValue({ videoUrl: 'video' });

    // Act
    await runSceneImageChain(3, generateImage, generateVideo);

    // Assert
    expect(generateImageArgs).toEqual([
      [0, undefined],
      [1, { url: 'img-0' }],
      [2, { url: 'img-1' }],
    ]);
  });

  it('starts video generation as soon as its image resolves, without waiting for subsequent images', async () => {
    // Arrange
    const generateVideoCalls: number[] = [];
    const imageDeferred = [
      createDeferred<{ url: string }>(),
      createDeferred<{ url: string }>(),
    ];

    const generateImage = jest.fn().mockImplementation((index: number) => {
      return imageDeferred[index].promise;
    });

    const generateVideo = jest
      .fn()
      .mockImplementation((image: { url: string }) => {
        generateVideoCalls.push(parseInt(image.url.split('-')[1]));
        return Promise.resolve({ videoUrl: 'video' });
      });

    // Act
    const chainPromise = runSceneImageChain(2, generateImage, generateVideo);

    // Resolve image 0
    imageDeferred[0].resolve({ url: 'img-0' });

    // Flush to allow video generation to start
    await Promise.resolve();

    // Assert: video 0 should be called even though image 1 is not resolved yet
    expect(generateVideoCalls).toContain(0);

    // Clean up
    imageDeferred[1].resolve({ url: 'img-1' });
    await chainPromise;
  });

  it('returns video results in the original scene order even if they resolve in reverse order', async () => {
    // Arrange
    const videoDeferred = [
      createDeferred<{ videoUrl: string }>(),
      createDeferred<{ videoUrl: string }>(),
      createDeferred<{ videoUrl: string }>(),
    ];

    const generateImage = jest
      .fn()
      .mockImplementation((index: number) =>
        Promise.resolve({ url: `img-${index}` }),
      );

    const generateVideo = jest
      .fn()
      .mockImplementation((image: { url: string }) => {
        const index = parseInt(image.url.split('-')[1]);
        return videoDeferred[index].promise;
      });

    // Act
    const chainPromise = runSceneImageChain(3, generateImage, generateVideo);

    // Resolve videos in reverse order
    videoDeferred[2].resolve({ videoUrl: 'video-2' });
    videoDeferred[1].resolve({ videoUrl: 'video-1' });
    videoDeferred[0].resolve({ videoUrl: 'video-0' });

    const result = await chainPromise;

    // Assert
    expect(result).toEqual([
      { videoUrl: 'video-0' },
      { videoUrl: 'video-1' },
      { videoUrl: 'video-2' },
    ]);
  });

  it('fails fast on image generation error and does not start subsequent images', async () => {
    // Arrange
    const generateImageCalls: number[] = [];
    const imageDeferred = [
      createDeferred<{ url: string }>(),
      createDeferred<{ url: string }>(),
      createDeferred<{ url: string }>(),
    ];

    const generateImage = jest.fn().mockImplementation((index: number) => {
      generateImageCalls.push(index);
      return imageDeferred[index].promise;
    });

    const generateVideo = jest.fn().mockResolvedValue({ videoUrl: 'video' });

    // Act
    const chainPromise = runSceneImageChain(3, generateImage, generateVideo);

    // Resolve image 0
    imageDeferred[0].resolve({ url: 'img-0' });
    await Promise.resolve();

    // Reject image 1
    imageDeferred[1].reject(new Error('image 1 failed'));
    await expect(chainPromise).rejects.toThrow('image 1 failed');

    // Assert
    expect(generateImageCalls).toEqual([0, 1]);
  });

  it('fails fast on video error and stops starting new images, without unhandled rejection', async () => {
    // Arrange
    const generateImageCalls: number[] = [];
    const imageDeferred = [
      createDeferred<{ url: string }>(),
      createDeferred<{ url: string }>(),
      createDeferred<{ url: string }>(),
    ];

    const generateImage = jest.fn().mockImplementation((index: number) => {
      generateImageCalls.push(index);
      return imageDeferred[index].promise;
    });

    const generateVideo = jest
      .fn()
      .mockImplementation((image: { url: string }) => {
        const index = parseInt(image.url.split('-')[1]);
        if (index === 0) {
          return Promise.reject(new Error('video 0 failed'));
        }
        return Promise.resolve({ videoUrl: `video-${index}` });
      });

    let unhandledRejection: unknown;
    const unhandledRejectionHandler = (error: unknown) => {
      unhandledRejection = error;
    };
    process.on('unhandledRejection', unhandledRejectionHandler);

    try {
      // Act
      const chainPromise = runSceneImageChain(3, generateImage, generateVideo);

      // Resolve image 0
      imageDeferred[0].resolve({ url: 'img-0' });
      await Promise.resolve();

      // Resolve image 1
      imageDeferred[1].resolve({ url: 'img-1' });
      await Promise.resolve();

      // Wait for the chain to fail
      await expect(chainPromise).rejects.toThrow('video 0 failed');

      // Give a moment for any unhandled rejections to surface
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(generateImageCalls).toEqual([0, 1]);
      expect(unhandledRejection).toBeUndefined();
    } finally {
      process.removeListener('unhandledRejection', unhandledRejectionHandler);
    }
  });
});
