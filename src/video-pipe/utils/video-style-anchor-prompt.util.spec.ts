import {
  buildVideoStyleAnchorPrompt,
  VIDEO_STYLE_ANCHOR_SHEET_NOTE,
} from './video-style-anchor-prompt.util';

describe('buildVideoStyleAnchorPrompt', () => {
  it('includes style and description literally with group frame and neutral background', () => {
    // Arrange
    const style = 'noir';
    const description = '2D cel-shading, flat colors.';

    // Act
    const result = buildVideoStyleAnchorPrompt(style, description);

    // Assert
    expect(result).toContain('noir');
    expect(result).toContain(description);
    expect(result).toMatch(/групп/i);
    expect(result).toMatch(/нейтральн/i);
  });

  it('does not contain null or undefined string representations without description', () => {
    // Arrange
    const style = 'noir';
    const description = null;

    // Act
    const result = buildVideoStyleAnchorPrompt(style, description);

    // Assert
    expect(result).toContain('noir');
    expect(result).not.toContain('null');
    expect(result).not.toContain('undefined');
  });

  it('includes the character sheet note verbatim', () => {
    // Arrange
    const style = 'anime';
    const description = null;

    // Act
    const result = buildVideoStyleAnchorPrompt(style, description);

    // Assert
    expect(result).toContain(VIDEO_STYLE_ANCHOR_SHEET_NOTE);
  });
});
