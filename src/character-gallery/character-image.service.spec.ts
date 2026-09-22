jest.mock('src/ai-providers/xai/xai.service', () => ({
  XaiService: jest.fn(),
}));

jest.mock('src/storage/storage.service', () => ({
  StorageService: jest.fn(),
}));

import { InternalServerErrorException } from '@nestjs/common';
import { CharacterImageService } from './character-image.service';
import type { XaiService } from 'src/ai-providers/xai/xai.service';
import type { StorageService } from 'src/storage/storage.service';

describe('CharacterImageService', () => {
  let xaiService: { generateImage: jest.Mock };
  let storageService: { uploadGeneratedFile: jest.Mock };
  let service: CharacterImageService;

  beforeEach(() => {
    xaiService = {
      generateImage: jest.fn(),
    };

    storageService = {
      uploadGeneratedFile: jest.fn(),
    };

    service = new CharacterImageService(
      xaiService as unknown as XaiService,
      storageService as unknown as StorageService,
    );
  });

  describe('generateCharacterImage', () => {
    it('generates image through XaiService and uploads via StorageService', async () => {
      // Arrange
      const prompt = 'bold noir detective';
      const style = 'noir';
      const image = {
        uint8Array: new Uint8Array([1, 2, 3]),
        mediaType: 'image/png',
      };

      xaiService.generateImage.mockResolvedValue(image);
      storageService.uploadGeneratedFile.mockResolvedValue({
        key: 'characters/1700000000000-uuid.png',
        url: 'https://s3/x.png',
        etag: 'etag',
      });

      // Act
      const result = await service.generateCharacterImage(prompt, style);

      // Assert
      expect(xaiService.generateImage).toHaveBeenCalledTimes(1);
      const generateCall = xaiService.generateImage.mock.calls[0] as unknown[];
      expect((generateCall[0] as Record<string, string>).prompt).toContain(
        'bold noir detective',
      );

      expect(storageService.uploadGeneratedFile).toHaveBeenCalledTimes(1);
      const uploadCall = storageService.uploadGeneratedFile.mock
        .calls[0] as unknown[];
      expect(uploadCall[0]).toEqual(image);
      expect(uploadCall[1]).toBe('characters');

      expect(result).toBe('https://s3/x.png');
    });
  });

  describe('generateCharacterImage failure', () => {
    it('throws InternalServerErrorException when generation returns null', async () => {
      // Arrange
      const prompt = 'character';
      const style = 'noir';

      xaiService.generateImage.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateCharacterImage(prompt, style),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.generateCharacterImage(prompt, style),
      ).rejects.toThrow('Character image generation failed.');

      expect(storageService.uploadGeneratedFile).not.toHaveBeenCalled();
    });
  });
});
