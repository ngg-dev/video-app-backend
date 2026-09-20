import { experimental_generateVideo as generateVideo, generateImage } from 'ai';
import { XaiService } from './xai.service';
import { AppLoggerService } from 'src/shared/logger/logger.service';

jest.mock('ai', () => ({
  experimental_generateVideo: jest.fn(),
  generateImage: jest.fn(),
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/xai', () => ({
  createXai: jest.fn().mockReturnValue({
    video: jest.fn().mockReturnValue('mock-video-model'),
    languageModel: jest.fn().mockReturnValue('mock-model'),
  }),
  xai: {
    image: jest.fn().mockReturnValue('mock-image-model'),
  },
}));

describe('XaiService.generateVideo', () => {
  let service: XaiService;
  let logger: AppLoggerService;

  beforeEach(() => {
    logger = new AppLoggerService();
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    service = new XaiService(logger);
    jest.clearAllMocks();
  });

  const baseParams = {
    prompt: 'animate it',
    referenceImageUrls: ['https://example.com/scene.png'],
  };

  it('returns videoUrl extracted from providerMetadata.xai.videoUrl', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({
      video,
      providerMetadata: {
        xai: { videoUrl: 'https://provider.example/video.mp4' },
      },
    });

    const result = await service.generateVideo(baseParams);

    expect(result).toEqual({
      video,
      videoUrl: 'https://provider.example/video.mp4',
    });
  });

  it('returns videoUrl null when providerMetadata is missing', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({ video });

    const result = await service.generateVideo(baseParams);

    expect(result).toEqual({ video, videoUrl: null });
  });

  it('returns videoUrl null when providerMetadata.xai is missing', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({
      video,
      providerMetadata: {},
    });

    const result = await service.generateVideo(baseParams);

    expect(result).toEqual({ video, videoUrl: null });
  });

  it('returns videoUrl null when videoUrl is not a string', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({
      video,
      providerMetadata: { xai: { videoUrl: 123 } },
    });

    const result = await service.generateVideo(baseParams);

    expect(result).toEqual({ video, videoUrl: null });
  });

  it('returns videoUrl null when videoUrl is an empty string', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({
      video,
      providerMetadata: { xai: { videoUrl: '' } },
    });

    const result = await service.generateVideo(baseParams);

    expect(result).toEqual({ video, videoUrl: null });
  });

  it('returns null when the provider does not return a video', async () => {
    (generateVideo as jest.Mock).mockResolvedValue({ video: null });

    const result = await service.generateVideo(baseParams);

    expect(result).toBeNull();
  });

  it('forwards duration to the provider when given', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({ video });

    await service.generateVideo({ ...baseParams, duration: 5 });

    expect(generateVideo).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 5 }),
    );
  });

  it('omits duration from the provider call when not given', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({ video });

    await service.generateVideo(baseParams);

    const [callArg] = (generateVideo as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(callArg).not.toHaveProperty('duration');
  });

  it('logs external.request and external.response', async () => {
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({
      video,
      providerMetadata: {
        xai: { videoUrl: 'https://provider.example/video.mp4' },
      },
    });

    await service.generateVideo(baseParams);

    const loggedEvents = (logger.log as jest.Mock).mock.calls.map((call) =>
      JSON.stringify(call),
    );
    expect(loggedEvents.some((c) => c.includes('external.request'))).toBe(true);
    expect(loggedEvents.some((c) => c.includes('external.response'))).toBe(
      true,
    );
  });

  it('logs external.error and rethrows when the provider rejects', async () => {
    const error = new Error('provider down');
    (generateVideo as jest.Mock).mockRejectedValue(error);

    await expect(service.generateVideo(baseParams)).rejects.toBe(error);

    const loggedEvents = (logger.error as jest.Mock).mock.calls.map((call) =>
      JSON.stringify(call),
    );
    expect(loggedEvents.some((c) => c.includes('external.error'))).toBe(true);
  });

  it('calls the provider with the full expected shape, including model, prompt, duration and providerOptions.xai', async () => {
    // Arrange
    const video = { uint8Array: new Uint8Array(), mediaType: 'video/mp4' };
    (generateVideo as jest.Mock).mockResolvedValue({ video });

    // Act
    await service.generateVideo({
      prompt: 'animate it',
      referenceImageUrls: ['https://example.com/scene.png'],
      resolution: '720p',
      duration: 5,
    });

    // Assert
    expect(generateVideo).toHaveBeenCalledWith({
      model: 'mock-video-model',
      prompt: 'animate it',
      duration: 5,
      providerOptions: {
        xai: {
          mode: 'reference-to-video',
          referenceImageUrls: ['https://example.com/scene.png'],
          resolution: '720p',
        },
      },
    });
  });
});

describe('XaiService.generateImage', () => {
  let service: XaiService;
  let logger: AppLoggerService;

  beforeEach(() => {
    logger = new AppLoggerService();
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    service = new XaiService(logger);
    jest.clearAllMocks();
  });

  it('calls the provider with wrapped prompt, referenceImages and aspectRatio when given', async () => {
    // Arrange
    (generateImage as jest.Mock).mockResolvedValue({
      image: { mediaType: 'image/png' },
    });

    // Act
    await service.generateImage({
      prompt: 'a hero',
      referenceImages: ['data'],
      aspectRatio: '9:16',
    });

    // Assert
    expect(generateImage).toHaveBeenCalledWith({
      model: 'mock-image-model',
      prompt: { text: 'a hero', images: ['data'] },
      aspectRatio: '9:16',
    });
  });

  it('calls the provider with a plain string prompt and no aspectRatio key when only prompt is given', async () => {
    // Arrange
    (generateImage as jest.Mock).mockResolvedValue({
      image: { mediaType: 'image/png' },
    });

    // Act
    await service.generateImage({ prompt: 'a hero' });

    // Assert
    const [callArg] = (generateImage as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(callArg.prompt).toBe('a hero');
    expect(callArg).not.toHaveProperty('aspectRatio');
  });
});
