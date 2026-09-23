import { buildSceneReferenceImages } from './scene-reference-images.util';

describe('buildSceneReferenceImages', () => {
  it('returns exactly the character reference images when no style reference is provided', () => {
    // Arrange
    const characterImages = ['a.png', 'b.png'];
    const styleReferenceImageUrl = undefined;

    // Act
    const result = buildSceneReferenceImages(
      characterImages,
      styleReferenceImageUrl,
    );

    // Assert
    expect(result).toEqual(['a.png', 'b.png']);
  });

  it('appends the style reference image last when it is provided', () => {
    // Arrange
    const characterImages = ['a.png', 'b.png'];
    const styleReferenceImageUrl = 'prev.png';

    // Act
    const result = buildSceneReferenceImages(
      characterImages,
      styleReferenceImageUrl,
    );

    // Assert
    expect(result).toEqual(['a.png', 'b.png', 'prev.png']);
  });

  it('does not mutate the input array', () => {
    // Arrange
    const input = ['a.png'];
    const styleReferenceImageUrl = 'prev.png';

    // Act
    buildSceneReferenceImages(input, styleReferenceImageUrl);

    // Assert
    expect(input).toEqual(['a.png']);
  });
});
