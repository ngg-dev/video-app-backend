import { InternalServerErrorException } from '@nestjs/common';
import { RunwareImageController } from './runware-image.controller';
import { RunwareVideoController } from './runware-video.controller';
import { RunwareTextController } from './runware-text.controller';
import type { RunwareService } from './runware.service';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

describe('RunwareImageController', () => {
  let controller: RunwareImageController;
  let mockService: Partial<RunwareService>;

  beforeEach(() => {
    mockService = {
      generateImage: jest.fn(),
    };
    controller = new RunwareImageController(
      mockService as unknown as RunwareService,
    );
  });

  it('returns imageUrl when service returns a URL', async () => {
    // Arrange
    (mockService.generateImage as jest.Mock).mockResolvedValue(
      'https://r/i.png',
    );

    // Act
    const result = await controller.generate({
      prompt: 'p',
      referenceImages: ['r'],
      width: 512,
      height: 512,
    });

    // Assert
    expect(result).toEqual({ imageUrl: 'https://r/i.png' });
    expect(mockService.generateImage).toHaveBeenCalledWith({
      prompt: 'p',
      referenceImages: ['r'],
      width: 512,
      height: 512,
    });
  });

  it('throws InternalServerErrorException when service returns null', async () => {
    // Arrange
    (mockService.generateImage as jest.Mock).mockResolvedValue(null);

    // Act
    const promise = controller.generate({ prompt: 'p' });

    // Assert
    await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe('RunwareVideoController', () => {
  let controller: RunwareVideoController;
  let mockService: Partial<RunwareService>;

  beforeEach(() => {
    mockService = {
      generateVideo: jest.fn(),
    };
    controller = new RunwareVideoController(
      mockService as unknown as RunwareService,
    );
  });

  it('returns videoUrl when service returns a URL with all parameters', async () => {
    // Arrange
    (mockService.generateVideo as jest.Mock).mockResolvedValue(
      'https://r/v.mp4',
    );

    // Act
    const result = await controller.generate({
      prompt: 'p',
      referenceImageUrls: ['https://x/s.png'],
      aspectRatio: VideoAspectRatio.Horizontal,
      duration: 8,
    });

    // Assert
    expect(result).toEqual({ videoUrl: 'https://r/v.mp4' });
    expect(mockService.generateVideo).toHaveBeenCalledWith({
      prompt: 'p',
      referenceImageUrls: ['https://x/s.png'],
      aspectRatio: VideoAspectRatio.Horizontal,
      duration: 8,
    });
  });

  it('throws InternalServerErrorException when service returns null', async () => {
    // Arrange
    (mockService.generateVideo as jest.Mock).mockResolvedValue(null);

    // Act
    const promise = controller.generate({ prompt: 'p' });

    // Assert
    await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe('RunwareTextController', () => {
  let controller: RunwareTextController;
  let mockService: Partial<RunwareService>;

  beforeEach(() => {
    mockService = {
      generateText: jest.fn(),
    };
    controller = new RunwareTextController(
      mockService as unknown as RunwareService,
    );
  });

  it('returns empty string when service returns null', async () => {
    // Arrange
    (mockService.generateText as jest.Mock).mockResolvedValue(null);

    // Act
    const result = await controller.generate({ prompt: 'p' });

    // Assert
    expect(result).toEqual({ message: '' });
  });
});
