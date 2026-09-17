import { experimental_generateVideo as generateVideo } from 'ai';
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
});
