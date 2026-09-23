jest.mock('src/ai-providers/xai/xai.service', () => ({
  XaiService: jest.fn(),
}));

jest.mock('src/storage/storage.service', () => ({
  StorageService: jest.fn(),
}));

import { InternalServerErrorException } from '@nestjs/common';
import { VideoStyleAnchorService } from './video-style-anchor.service';
import type { XaiService } from 'src/ai-providers/xai/xai.service';
import type { StorageService } from 'src/storage/storage.service';
import { VIDEO_STYLE_ANCHOR_KEY_PREFIX } from './constants/video-pipe.constant';
import { buildVideoStyleAnchorPrompt } from './utils/video-style-anchor-prompt.util';

describe('VideoStyleAnchorService', () => {
  let xaiService: { generateImage: jest.Mock };
  let storageService: { uploadGeneratedFile: jest.Mock };
  let service: VideoStyleAnchorService;

  beforeEach(() => {
    jest.clearAllMocks();

    xaiService = {
      generateImage: jest.fn(),
    };

    storageService = {
      uploadGeneratedFile: jest.fn(),
    };

    service = new VideoStyleAnchorService(
      xaiService as unknown as XaiService,
      storageService as unknown as StorageService,
    );
  });

  describe('generateStyleAnchor', () => {
    it('generates image with prompt built from collection properties and reference images', async () => {
      // Arrange
      const image = {
        uint8Array: new Uint8Array([1, 2, 3]),
        mediaType: 'image/png',
      };

      xaiService.generateImage.mockResolvedValue(image);
      storageService.uploadGeneratedFile.mockResolvedValue({
        url: 'https://s3/anchor.png',
      });

      const collection = {
        style: 'noir',
        styleDescription: 'heavy ink',
      };

      const refs = ['https://img/a.png', 'https://img/b.png'];

      // Act
      await service.generateStyleAnchor(collection, refs);

      // Assert
      expect(xaiService.generateImage).toHaveBeenCalledTimes(1);
      const generateCall = (
        xaiService.generateImage.mock.calls as unknown[][]
      )[0][0] as { prompt: string; referenceImages?: string[] };
      expect(generateCall.prompt).toBe(
        buildVideoStyleAnchorPrompt('noir', 'heavy ink'),
      );
      expect(generateCall.referenceImages).toEqual(refs);
    });

    it('uploads generated image to storage with VIDEO_STYLE_ANCHOR_KEY_PREFIX and returns url', async () => {
      // Arrange
      const image = {
        uint8Array: new Uint8Array([1, 2, 3]),
        mediaType: 'image/png',
      };

      xaiService.generateImage.mockResolvedValue(image);
      storageService.uploadGeneratedFile.mockResolvedValue({
        url: 'https://s3/anchor.png',
      });

      const collection = {
        style: 'noir',
        styleDescription: 'heavy ink',
      };

      const refs = ['https://img/a.png', 'https://img/b.png'];

      // Act
      const result = await service.generateStyleAnchor(collection, refs);

      // Assert
      expect(storageService.uploadGeneratedFile).toHaveBeenCalledWith(
        image,
        VIDEO_STYLE_ANCHOR_KEY_PREFIX,
      );
      expect(result).toBe('https://s3/anchor.png');
    });

    it('builds prompt without description when styleDescription is null', async () => {
      // Arrange
      const image = {
        uint8Array: new Uint8Array([1, 2, 3]),
        mediaType: 'image/png',
      };

      xaiService.generateImage.mockResolvedValue(image);
      storageService.uploadGeneratedFile.mockResolvedValue({
        url: 'https://s3/anchor.png',
      });

      const collection = {
        style: 'noir',
        styleDescription: null,
      };

      const refs = ['https://img/a.png'];

      // Act
      await service.generateStyleAnchor(collection, refs);

      // Assert
      const generateCall = (
        xaiService.generateImage.mock.calls as unknown[][]
      )[0][0] as { prompt: string; referenceImages?: string[] };
      expect(generateCall.prompt).toBe(
        buildVideoStyleAnchorPrompt('noir', null),
      );
    });

    it('throws InternalServerErrorException when xAI returns null', async () => {
      // Arrange
      xaiService.generateImage.mockResolvedValue(null);

      const collection = {
        style: 'noir',
        styleDescription: 'heavy ink',
      };

      const refs = ['https://img/a.png'];

      // Act & Assert
      await expect(
        service.generateStyleAnchor(collection, refs),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.generateStyleAnchor(collection, refs),
      ).rejects.toThrow('Video style anchor generation failed.');

      expect(storageService.uploadGeneratedFile).not.toHaveBeenCalled();
    });

    it('propagates xAI service exceptions without catching', async () => {
      // Arrange
      const xaiError = new Error('xai down');
      xaiService.generateImage.mockRejectedValue(xaiError);

      const collection = {
        style: 'noir',
        styleDescription: 'heavy ink',
      };

      const refs = ['https://img/a.png'];

      // Act & Assert
      await expect(
        service.generateStyleAnchor(collection, refs),
      ).rejects.toThrow('xai down');

      expect(storageService.uploadGeneratedFile).not.toHaveBeenCalled();
    });

    it('has no database dependencies (only XaiService and StorageService)', () => {
      // Arrange & Act & Assert
      // Constructor should only have 2 parameters: XaiService and StorageService
      expect(VideoStyleAnchorService.length).toBe(2);

      // Verify that we can create service with only these two dependencies
      const testService = new VideoStyleAnchorService(
        xaiService as unknown as XaiService,
        storageService as unknown as StorageService,
      );

      expect(testService).toBeDefined();
    });
  });
});
