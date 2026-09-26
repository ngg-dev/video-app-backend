import {
  buildSceneStyleTag,
  buildSceneStyleHint,
  buildSceneCharacterReferenceLine,
} from './scene-prompt.constant';

describe('buildSceneStyleTag, buildSceneStyleHint', () => {
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
      expect(result1).toBe(
        'Визуальный стиль: noir. Строго сохраняй этот визуальный стиль.',
      );
      expect(result2).toBe(
        'Визуальный стиль: noir. Строго сохраняй этот визуальный стиль.',
      );
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
        'Оформи изображение в следующем визуальном стиле: noir.',
      );
    });
  });

  describe('buildSceneCharacterReferenceLine', () => {
    it('uses "character" placeholder when name is empty', () => {
      // Arrange
      const position = 2;
      const name = '';

      // Act
      const result = buildSceneCharacterReferenceLine(position, name);

      // Assert
      expect(result).toBe(
        'Изображение 2: персонаж — точно сохраняй лицо, волосы, телосложение, одежду.',
      );
    });
  });
});
