import { extensionFromMediaType } from './index';

describe('extensionFromMediaType', () => {
  it('extracts extension from image/webp', () => {
    // Arrange
    const mediaType = 'image/webp';

    // Act
    const ext = extensionFromMediaType(mediaType);

    // Assert
    expect(ext).toBe('webp');
  });

  it('extracts extension from video/mp4', () => {
    // Arrange
    const mediaType = 'video/mp4';

    // Act
    const ext = extensionFromMediaType(mediaType);

    // Assert
    expect(ext).toBe('mp4');
  });

  it('returns default fallback when mediaType is undefined', () => {
    // Arrange
    const mediaType = undefined;

    // Act
    const ext = extensionFromMediaType(mediaType);

    // Assert
    expect(ext).toBe('png');
  });

  it('returns explicit fallback when mediaType is undefined', () => {
    // Arrange
    const mediaType = undefined;
    const fallback = 'jpg';

    // Act
    const ext = extensionFromMediaType(mediaType, fallback);

    // Assert
    expect(ext).toBe('jpg');
  });
});
