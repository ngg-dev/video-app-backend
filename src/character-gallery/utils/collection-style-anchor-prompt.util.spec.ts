import { buildCollectionStyleAnchorPrompt } from './collection-style-anchor-prompt.util';

describe('buildCollectionStyleAnchorPrompt', () => {
  it('includes style and description literally with group frame and neutral background', () => {
    // Arrange
    const style = 'noir';
    const description = '2D cel-shading, flat colors.';

    // Act
    const result = buildCollectionStyleAnchorPrompt(style, description);

    // Assert
    expect(result).toContain('noir');
    expect(result).toContain(description);
    expect(result).toMatch(/group/i);
    expect(result).toMatch(/neutral/i);
  });

  it('does not contain null or undefined string representations without description', () => {
    // Arrange
    const style = 'noir';
    const description = null;

    // Act
    const result = buildCollectionStyleAnchorPrompt(style, description);

    // Assert
    expect(result).toContain('noir');
    expect(result).not.toContain('null');
    expect(result).not.toContain('undefined');
  });
});
