import {
  buildSceneStyleTag,
  buildSceneStyleHint,
  buildSceneStyleReferenceNote,
  SCENE_STYLE_REFERENCE_NOTE,
} from './scene-prompt.constant';

describe('buildSceneStyleReferenceNote, buildSceneStyleTag, buildSceneStyleHint', () => {
  describe('buildSceneStyleReferenceNote', () => {
    it('returns empty string when no style anchors are present', () => {
      // Arrange
      const params = {
        characterReferenceCount: 2,
        hasStyleAnchor: false,
        hasPreviousScene: false,
      };

      // Act
      const result = buildSceneStyleReferenceNote(params);

      // Assert
      expect(result).toBe('');
    });

    it('returns the current SCENE_STYLE_REFERENCE_NOTE when only N-1 is present', () => {
      // Arrange
      const params = {
        characterReferenceCount: 2,
        hasStyleAnchor: false,
        hasPreviousScene: true,
      };

      // Act
      const result = buildSceneStyleReferenceNote(params);

      // Assert
      expect(result).toBe(SCENE_STYLE_REFERENCE_NOTE);
    });

    it('returns anchor note with position #1 when only anchor is present with 0 characters', () => {
      // Arrange
      const params = {
        characterReferenceCount: 0,
        hasStyleAnchor: true,
        hasPreviousScene: false,
      };

      // Act
      const result = buildSceneStyleReferenceNote(params);

      // Assert
      expect(result).toContain('reference image #1');
      expect(result).not.toContain('#2');
      expect(result).toMatch(/composition/i);
      expect(result).toMatch(/background/i);
      expect(result).toMatch(/characters/i);
      expect(result).toMatch(/story/i);
      expect(result).toMatch(/anchor/i);
    });

    it('returns anchor note with position #3 when anchor is present with 2 characters', () => {
      // Arrange
      const params = {
        characterReferenceCount: 2,
        hasStyleAnchor: true,
        hasPreviousScene: false,
      };

      // Act
      const result = buildSceneStyleReferenceNote(params);

      // Assert
      expect(result).toContain('reference image #3');
      expect(result).not.toContain('reference image #4');
    });

    it('returns both anchor and N-1 notes with positions #1 and #2 when both present with 0 characters', () => {
      // Arrange
      const params = {
        characterReferenceCount: 0,
        hasStyleAnchor: true,
        hasPreviousScene: true,
      };

      // Act
      const result = buildSceneStyleReferenceNote(params);

      // Assert
      expect(result).toContain('reference image #1');
      expect(result).toContain('reference image #2');
    });

    it('returns both anchor and N-1 notes with positions #3 and #4 when both present with 2 characters', () => {
      // Arrange
      const params = {
        characterReferenceCount: 2,
        hasStyleAnchor: true,
        hasPreviousScene: true,
      };

      // Act
      const result = buildSceneStyleReferenceNote(params);

      // Assert
      expect(result).toContain('reference image #3');
      expect(result).toContain('reference image #4');
      const index3 = result.indexOf('#3');
      const index4 = result.indexOf('#4');
      expect(index3 < index4).toBe(true);
      expect(result.substring(index3, index4)).toMatch(
        /anchor|main visual style/i,
      );
      expect(result.substring(index4)).toMatch(/previous scene|continuity/i);
    });
  });

  describe('buildSceneStyleTag', () => {
    it('contains the style and description literally', () => {
      // Arrange
      const style = 'noir';
      const description = '2D cel-shading, thick black outlines, flat colors.';

      // Act
      const result = buildSceneStyleTag(style, description);

      // Assert
      expect(result).toContain('noir');
      expect(result).toContain(description);
    });

    it('without description matches the current format byte-for-byte', () => {
      // Arrange
      const style = 'noir';

      // Act
      const result1 = buildSceneStyleTag(style, null);
      const result2 = buildSceneStyleTag(style);

      // Assert
      expect(result1).toBe('Visual style: noir. Keep this exact visual style.');
      expect(result2).toBe('Visual style: noir. Keep this exact visual style.');
      expect(result1).toBe(result2);
    });
  });

  describe('buildSceneStyleHint', () => {
    it('contains the style and description literally', () => {
      // Arrange
      const style = 'noir';
      const description = '2D cel-shading, flat colors.';

      // Act
      const result = buildSceneStyleHint(style, description);

      // Assert
      expect(result).toContain('noir');
      expect(result).toContain(description);
    });

    it('without description matches the current format byte-for-byte', () => {
      // Arrange
      const style = 'noir';

      // Act
      const result = buildSceneStyleHint(style, null);

      // Assert
      expect(result).toBe(
        'Render the image in the following visual style: noir.',
      );
    });
  });
});
