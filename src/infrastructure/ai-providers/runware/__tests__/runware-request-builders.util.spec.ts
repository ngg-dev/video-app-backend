import {
  buildImageInferenceParams,
  buildTextInferenceParams,
  buildVideoInferenceParams,
} from '../utils/runware-request-builders.util';
import { RUNWARE_DEFAULT_IMAGE_SIZE } from 'src/shared/constants/runware';
import {
  DEFAULT_VIDEO_ASPECT_RATIO,
  VideoAspectRatio,
  VIDEO_ASPECT_RATIO_DIMENSIONS,
} from 'src/shared/constants/video-aspect-ratio';
import { DEFAULT_VIDEO_DURATION_SECONDS } from 'src/shared/constants/video-duration';

describe('buildTextInferenceParams', () => {
  it('returns params with model, messages array and cost/usage flags for text prompt', () => {
    // Arrange
    const params = { model: 'm', prompt: 'hi' };

    // Act
    const result = buildTextInferenceParams(params);

    // Assert
    expect(result).toEqual({
      model: 'm',
      messages: [{ role: 'user', content: 'hi' }],
      includeCost: true,
      includeUsage: true,
    });
  });
});

describe('buildImageInferenceParams', () => {
  it('builds image params without reference images and without explicit size - uses defaults', () => {
    // Arrange
    const params = { model: 'm', prompt: 'a cat' };

    // Act
    const result = buildImageInferenceParams(params);

    // Assert
    expect(result).toEqual({
      model: 'm',
      positivePrompt: 'a cat',
      width: RUNWARE_DEFAULT_IMAGE_SIZE.width,
      height: RUNWARE_DEFAULT_IMAGE_SIZE.height,
      outputType: 'URL',
      includeCost: true,
    });
    expect(result).not.toHaveProperty('inputs');
  });

  it('does not include inputs when referenceImages is an empty array', () => {
    // Arrange
    const params = { model: 'm', prompt: 'a cat', referenceImages: [] };

    // Act
    const result = buildImageInferenceParams(params);

    // Assert
    expect(result).not.toHaveProperty('inputs');
  });

  it('includes inputs with referenceImages and respects explicit width and height', () => {
    // Arrange
    const params = {
      model: 'm',
      prompt: 'a cat',
      referenceImages: ['https://x/a.png'],
      width: 768,
      height: 1344,
    };

    // Act
    const result = buildImageInferenceParams(params);

    // Assert
    expect(result.inputs).toEqual({ referenceImages: ['https://x/a.png'] });
    expect(result.width).toBe(768);
    expect(result.height).toBe(1344);
  });
});

describe('buildVideoInferenceParams', () => {
  it('builds video params with default aspect ratio and duration', () => {
    // Arrange
    const params = { model: 'm', prompt: 'go' };

    // Act
    const result = buildVideoInferenceParams(params);

    // Assert
    const defaultDims =
      VIDEO_ASPECT_RATIO_DIMENSIONS[DEFAULT_VIDEO_ASPECT_RATIO];
    expect(result.width).toBe(defaultDims.width);
    expect(result.height).toBe(defaultDims.height);
    expect(result.duration).toBe(DEFAULT_VIDEO_DURATION_SECONDS);
    expect(result.outputType).toBe('URL');
    expect(result.includeCost).toBe(true);
    expect(result).not.toHaveProperty('inputs');
    expect(result).not.toHaveProperty('deliveryMethod');
  });

  it('uses specified aspectRatio and duration with reference images', () => {
    // Arrange
    const params = {
      model: 'm',
      prompt: 'go',
      aspectRatio: VideoAspectRatio.Horizontal,
      duration: 8,
      referenceImageUrls: ['https://x/s.png'],
    };

    // Act
    const result = buildVideoInferenceParams(params);

    // Assert
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    expect(result.duration).toBe(8);
    expect(result.inputs).toEqual({ referenceImages: ['https://x/s.png'] });
  });
});
