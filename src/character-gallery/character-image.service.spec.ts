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
  const appearance = {
    ageAndGender: 'AGE',
    face: 'FACE',
    hair: 'HAIR',
    build: 'BUILD',
    outfit: 'OUTFIT',
    footwear: 'FOOTWEAR',
    accessories: 'ACCESSORIES',
    palette: 'PALETTE',
  };

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

  describe('generateCharacterSheet', () => {
    it('generates image through XaiService and uploads via StorageService', async () => {
      // Arrange
      const prompt = appearance;
      const style = { style: 'noir', styleDescription: null };
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
      const result = await service.generateCharacterSheet(prompt, style);

      // Assert
      expect(xaiService.generateImage).toHaveBeenCalledTimes(1);
      const generateCall = xaiService.generateImage.mock.calls[0] as unknown[];
      expect((generateCall[0] as Record<string, string>).prompt).toContain(
        'FACE',
      );

      expect(storageService.uploadGeneratedFile).toHaveBeenCalledTimes(1);
      const uploadCall = storageService.uploadGeneratedFile.mock
        .calls[0] as unknown[];
      expect(uploadCall[0]).toEqual(image);
      expect(uploadCall[1]).toBe('characters');

      expect(result).toBe('https://s3/x.png');
    });

    it('generates character sheet with unique appearance values and style in the prompt', async () => {
      // Arrange
      const uniqueAppearance = {
        ageAndGender: '30, male',
        face: 'angular with scar',
        hair: 'short blonde',
        build: 'athletic, 180cm',
        outfit: 'leather jacket',
        footwear: 'black boots',
        accessories: 'silver chain',
        palette: 'cool tones',
      };
      const style = {
        style: 'noir',
        styleDescription: 'ink wash',
      };
      const image = {
        uint8Array: new Uint8Array([1, 2, 3]),
        mediaType: 'image/png',
      };

      xaiService.generateImage.mockResolvedValue(image);
      storageService.uploadGeneratedFile.mockResolvedValue({
        key: 'characters/uuid.png',
        url: 'https://s3/char.png',
        etag: 'etag',
      });

      // Act
      const result = await service.generateCharacterSheet(
        uniqueAppearance,
        style,
      );

      // Assert
      const [callParams] = xaiService.generateImage.mock.calls[0] as [
        Record<string, unknown>,
      ];
      const prompt = callParams.prompt as string;

      expect(prompt).toContain('30, male');
      expect(prompt).toContain('angular with scar');
      expect(prompt).toContain('short blonde');
      expect(prompt).toContain('athletic, 180cm');
      expect(prompt).toContain('leather jacket');
      expect(prompt).toContain('black boots');
      expect(prompt).toContain('silver chain');
      expect(prompt).toContain('cool tones');
      expect(prompt).toContain('noir');
      expect(prompt).toContain('ink wash');

      expect(callParams.aspectRatio).toBeDefined();
      expect(callParams.resolution).toBeDefined();

      expect(result).toBe('https://s3/char.png');
    });
  });

  describe('generateCharacterSheet failure', () => {
    it('throws InternalServerErrorException when generation returns null', async () => {
      // Arrange
      const prompt = appearance;
      const style = { style: 'noir', styleDescription: null };

      xaiService.generateImage.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateCharacterSheet(prompt, style),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.generateCharacterSheet(prompt, style),
      ).rejects.toThrow('Character image generation failed.');

      expect(storageService.uploadGeneratedFile).not.toHaveBeenCalled();
    });
  });
});
