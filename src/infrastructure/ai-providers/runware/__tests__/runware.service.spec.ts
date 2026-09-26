import { RunwareService } from '../services/runware.service';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { RUNWARE_API_KEY } from 'src/shared/constants/config';
import {
  runwareTextModels,
  runwareVideoModels,
} from 'src/shared/constants/runware';
import {
  DEFAULT_VIDEO_ASPECT_RATIO,
  VIDEO_ASPECT_RATIO_DIMENSIONS,
} from 'src/shared/constants/video-aspect-ratio';
import { DEFAULT_VIDEO_DURATION_SECONDS } from 'src/shared/constants/video-duration';
import type { RunwareClient, RunwareRunResult } from '../types/runware.types';

jest.mock('../utils/runware-client.factory');

describe('RunwareService', () => {
  let service: RunwareService;
  let logger: AppLoggerService;
  let fakeClient: Partial<RunwareClient>;
  let mockCreateRunwareClient: jest.Mock;

  beforeEach(() => {
    logger = new AppLoggerService();
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const mockRun = jest.fn();
    fakeClient = { run: mockRun };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('../utils/runware-client.factory') as Record<
      string,
      jest.Mock
    >;
    mockCreateRunwareClient = module.createRunwareClient;
    mockCreateRunwareClient.mockResolvedValue(fakeClient);
    service = new RunwareService(logger);
    jest.clearAllMocks();
  });

  describe('generateText', () => {
    it('returns text when client returns result with text', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      const response: RunwareRunResult[] = [
        { text: 'answer', finishReason: 'stop', usage: {} },
      ];
      mockRun.mockResolvedValue(response);

      // Act
      const result = await service.generateText({ prompt: 'q' });

      // Assert
      expect(result).toBe('answer');
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          model: runwareTextModels.gemma4_31b,
          messages: [{ role: 'user', content: 'q' }],
          includeCost: true,
          includeUsage: true,
        }),
      );
    });

    it('returns null when client returns empty array', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      mockRun.mockResolvedValue([]);

      // Act
      const result = await service.generateText({ prompt: 'q' });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateImage', () => {
    it('returns image URL when client returns imageURL, passing explicit model and references', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      const response: RunwareRunResult[] = [{ imageURL: 'https://r/i.png' }];
      mockRun.mockResolvedValue(response);

      // Act
      const result = await service.generateImage({
        model: 'custom:1@1',
        prompt: 'p',
        referenceImages: ['https://x/a.png'],
      });

      // Assert
      expect(result).toBe('https://r/i.png');
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom:1@1',
          positivePrompt: 'p',
          inputs: { referenceImages: ['https://x/a.png'] },
        }),
      );
    });

    it('returns null when client returns result without imageURL', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      const response: RunwareRunResult[] = [{ imageUUID: 'u' }];
      mockRun.mockResolvedValue(response);

      // Act
      const result = await service.generateImage({ prompt: 'p' });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateVideo', () => {
    it('returns video URL with defaults for aspect ratio and duration', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      const response: RunwareRunResult[] = [{ videoURL: 'https://r/v.mp4' }];
      mockRun.mockResolvedValue(response);

      // Act
      const result = await service.generateVideo({ prompt: 'p' });

      // Assert
      expect(result).toBe('https://r/v.mp4');
      const defaultDims =
        VIDEO_ASPECT_RATIO_DIMENSIONS[DEFAULT_VIDEO_ASPECT_RATIO];
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          model: runwareVideoModels.seedance20,
          duration: DEFAULT_VIDEO_DURATION_SECONDS,
          width: defaultDims.width,
          height: defaultDims.height,
        }),
      );
    });

    it('returns null when client returns empty array', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      mockRun.mockResolvedValue([]);

      // Act
      const result = await service.generateVideo({ prompt: 'p' });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('client caching', () => {
    it('creates client once and reuses it for subsequent calls', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      mockRun.mockResolvedValue([{ text: 'a' }]);

      // Act
      await service.generateText({ prompt: 'first' });
      await service.generateText({ prompt: 'second' });

      // Assert
      expect(mockCreateRunwareClient).toHaveBeenCalledTimes(1);
      expect(mockCreateRunwareClient).toHaveBeenCalledWith(RUNWARE_API_KEY);
      expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it('resets cache on client creation failure and retries on next call', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      const error = new Error('no key');
      mockCreateRunwareClient.mockRejectedValueOnce(error);
      mockCreateRunwareClient.mockResolvedValueOnce(fakeClient);
      mockRun.mockResolvedValue([{ text: 'a' }]);

      // Act
      const firstResult = await service
        .generateText({ prompt: 'first' })
        .catch((e: unknown) => e);
      const secondResult = await service.generateText({ prompt: 'second' });

      // Assert
      expect(firstResult).toBe(error);
      expect(secondResult).toBe('a');
      expect(mockCreateRunwareClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('logging', () => {
    it('logs external request and response on successful image generation', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      mockRun.mockResolvedValue([{ imageURL: 'https://r/i.png', cost: 0.02 }]);

      // Act
      await service.generateImage({ prompt: 'p' });

      // Assert
      const loggedEvents = (logger.log as jest.Mock).mock.calls.map((call) =>
        JSON.stringify(call),
      );
      expect(loggedEvents.some((c) => c.includes('external.request'))).toBe(
        true,
      );
      expect(loggedEvents.some((c) => c.includes('external.response'))).toBe(
        true,
      );
      expect(loggedEvents.some((c) => c.includes('runware'))).toBe(true);
      expect(loggedEvents.some((c) => c.includes('generateImage'))).toBe(true);
    });

    it('logs external error and rethrows when provider fails', async () => {
      // Arrange
      const mockRun = fakeClient.run as jest.Mock;
      const error = new Error('provider down');
      mockRun.mockRejectedValue(error);

      // Act & Assert
      await expect(service.generateVideo({ prompt: 'p' })).rejects.toBe(error);

      const loggedErrors = (logger.error as jest.Mock).mock.calls.map((call) =>
        JSON.stringify(call),
      );
      expect(loggedErrors.some((c) => c.includes('external.error'))).toBe(true);
      expect(loggedErrors.some((c) => c.includes('runware'))).toBe(true);
    });
  });
});
