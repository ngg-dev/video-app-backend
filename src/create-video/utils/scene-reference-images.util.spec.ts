import {
  buildSceneReferenceImages,
  selectCharacterReferenceImages,
} from './scene-reference-images.util';

describe('buildSceneReferenceImages and selectCharacterReferenceImages', () => {
  describe('buildSceneReferenceImages', () => {
    it('includes all three components in order: characters → anchor → N-1', () => {
      // Arrange
      const characterReferenceImages = ['a.png', 'b.png'];
      const styleAnchorImageUrl = 'anchor.png';
      const previousSceneImageUrl = 'prev.png';

      // Act
      const result = buildSceneReferenceImages({
        characterReferenceImages,
        styleAnchorImageUrl,
        previousSceneImageUrl,
      });

      // Assert
      expect(result).toEqual(['a.png', 'b.png', 'anchor.png', 'prev.png']);
    });

    it('handles empty character list with anchor and N-1', () => {
      // Arrange
      const characterReferenceImages: string[] = [];
      const styleAnchorImageUrl = 'anchor.png';
      const previousSceneImageUrl = 'prev.png';

      // Act
      const result = buildSceneReferenceImages({
        characterReferenceImages,
        styleAnchorImageUrl,
        previousSceneImageUrl,
      });

      // Assert
      expect(result).toEqual(['anchor.png', 'prev.png']);
    });

    it('handles no anchor (legacy behavior with N-1)', () => {
      // Arrange
      const characterReferenceImages = ['a.png'];
      const previousSceneImageUrl = 'prev.png';

      // Act
      const result = buildSceneReferenceImages({
        characterReferenceImages,
        styleAnchorImageUrl: undefined,
        previousSceneImageUrl,
      });

      // Assert
      expect(result).toEqual(['a.png', 'prev.png']);
    });

    it('handles no N-1 (anchor only)', () => {
      // Arrange
      const characterReferenceImages = ['a.png'];
      const styleAnchorImageUrl = 'anchor.png';

      // Act
      const result = buildSceneReferenceImages({
        characterReferenceImages,
        styleAnchorImageUrl,
        previousSceneImageUrl: undefined,
      });

      // Assert
      expect(result).toEqual(['a.png', 'anchor.png']);
    });

    it('handles only character images', () => {
      // Arrange
      const characterReferenceImages = ['a.png', 'b.png'];

      // Act
      const result = buildSceneReferenceImages({
        characterReferenceImages,
        styleAnchorImageUrl: undefined,
        previousSceneImageUrl: undefined,
      });

      // Assert
      expect(result).toEqual(['a.png', 'b.png']);
    });

    it('does not mutate the input array', () => {
      // Arrange
      const input = ['a.png'];
      const styleAnchorImageUrl = 'anchor.png';
      const previousSceneImageUrl = 'prev.png';

      // Act
      buildSceneReferenceImages({
        characterReferenceImages: input,
        styleAnchorImageUrl,
        previousSceneImageUrl,
      });

      // Assert
      expect(input).toEqual(['a.png']);
    });
  });

  describe('selectCharacterReferenceImages', () => {
    it('filters out empty strings and preserves order', () => {
      // Arrange
      const referenceImages = ['a.png', '', 'b.png'];

      // Act
      const result = selectCharacterReferenceImages(referenceImages);

      // Assert
      expect(result).toEqual(['a.png', 'b.png']);
    });
  });
});
