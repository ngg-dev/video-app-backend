import {
  DEFAULT_VIDEO_ASPECT_RATIO,
  VideoAspectRatio,
} from './video-aspect-ratio';

describe('VideoAspectRatio / DEFAULT_VIDEO_ASPECT_RATIO', () => {
  it('defaults to the vertical (9:16) aspect ratio', () => {
    // Arrange
    // (imports above)

    // Act
    const defaultValue = DEFAULT_VIDEO_ASPECT_RATIO;

    // Assert
    expect(defaultValue).toBe(VideoAspectRatio.Vertical);
    expect(defaultValue).toBe('9:16');
  });

  it('exposes exactly the three expected aspect ratio members', () => {
    // Arrange
    // (imports above)

    // Act
    const values = Object.values(VideoAspectRatio);

    // Assert
    expect(VideoAspectRatio.Vertical).toBe('9:16');
    expect(VideoAspectRatio.Horizontal).toBe('16:9');
    expect(VideoAspectRatio.Square).toBe('1:1');
    expect(values).toEqual(['9:16', '16:9', '1:1']);
  });
});
