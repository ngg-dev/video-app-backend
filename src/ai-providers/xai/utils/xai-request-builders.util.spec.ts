import {
  buildGenerateImageOptions,
  buildGenerateVideoOptions,
} from './xai-request-builders.util';

describe('buildGenerateImageOptions', () => {
  it('returns a string prompt without an aspectRatio key when only prompt is given', () => {
    // Arrange
    const params = { prompt: 'a hero' };

    // Act
    const result = buildGenerateImageOptions(params);

    // Assert
    expect(result.prompt).toBe('a hero');
    expect(result).not.toHaveProperty('aspectRatio');
  });

  it('wraps the prompt with reference images when a non-empty referenceImages array is given', () => {
    // Arrange
    const referenceImages = ['data:image/png;base64,abc'];
    const params = { prompt: 'a hero', referenceImages };

    // Act
    const result = buildGenerateImageOptions(params);

    // Assert
    expect(result.prompt).toEqual({ text: 'a hero', images: referenceImages });
  });

  it('returns a string prompt without an aspectRatio key when referenceImages is an empty array', () => {
    // Arrange
    const params = { prompt: 'a hero', referenceImages: [] };

    // Act
    const result = buildGenerateImageOptions(params);

    // Assert
    expect(result.prompt).toBe('a hero');
    expect(result).not.toHaveProperty('aspectRatio');
  });

  it('includes aspectRatio when it is given', () => {
    // Arrange
    const params = { prompt: 'a hero', aspectRatio: '9:16' as const };

    // Act
    const result = buildGenerateImageOptions(params);

    // Assert
    expect(result.aspectRatio).toBe('9:16');
  });

  it('includes resolution in providerOptions.xai when resolution is given', () => {
    // Arrange
    const params = { prompt: 'a hero', resolution: '2k' as const };

    // Act
    const result = buildGenerateImageOptions(params);

    // Assert
    expect(result.providerOptions).toEqual({ xai: { resolution: '2k' } });
  });

  it('does not include providerOptions when resolution is not given', () => {
    // Arrange
    const params = { prompt: 'a hero' };

    // Act
    const result = buildGenerateImageOptions(params);

    // Assert
    expect(result).not.toHaveProperty('providerOptions');
  });
});

describe('buildGenerateVideoOptions', () => {
  const baseParams = {
    prompt: 'animate it',
    referenceImageUrls: ['https://example.com/scene.png'],
  };

  it('omits duration and resolution when only base params are given', () => {
    // Arrange
    // baseParams has no duration/resolution

    // Act
    const result = buildGenerateVideoOptions(baseParams);

    // Assert
    expect(result).toEqual({
      prompt: 'animate it',
      providerOptions: {
        xai: {
          mode: 'reference-to-video',
          referenceImageUrls: ['https://example.com/scene.png'],
        },
      },
    });
    expect(result).not.toHaveProperty('duration');
    expect(result.providerOptions.xai).not.toHaveProperty('resolution');
  });

  it('includes duration at the root and resolution inside providerOptions.xai when both are given', () => {
    // Arrange
    const params = { ...baseParams, duration: 5, resolution: '720p' as const };

    // Act
    const result = buildGenerateVideoOptions(params);

    // Assert
    expect(result.duration).toBe(5);
    expect(result.providerOptions.xai.resolution).toBe('720p');
  });

  it('never includes a model key in the result', () => {
    // Arrange
    const params = { ...baseParams, duration: 5, resolution: '720p' as const };

    // Act
    const result = buildGenerateVideoOptions(params);

    // Assert
    expect(result).not.toHaveProperty('model');
  });
});
