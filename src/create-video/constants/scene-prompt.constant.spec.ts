import { buildSceneStyleTag } from './scene-prompt.constant';

describe('buildSceneStyleTag', () => {
  it('contains the style literally and returns empty string for null', () => {
    // Arrange
    const animeStyle = 'anime';
    const nullStyle = null;

    // Act
    const animeResult = buildSceneStyleTag(animeStyle);
    const nullResult = buildSceneStyleTag(nullStyle);

    // Assert
    expect(animeResult).toContain('anime');
    expect(nullResult).toBe('');
  });
});
