jest.mock('src/ai-providers/deepseek/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

import { CreateVideoPromptService } from './create-video-prompt.service';
import type { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import {
  SCENE_IMAGE_PROMPT_INSTRUCTIONS,
  SCENE_VIDEO_PROMPT_INSTRUCTIONS,
  SCENE_STYLE_REFERENCE_NOTE,
  buildSceneImageCharactersHint,
  buildSceneVideoCharactersHint,
  buildSceneStyleHint,
  buildSceneAspectRatioHint,
  buildSceneLine,
  buildSceneStyleTag,
  buildSceneCharacterSheetNote,
} from './constants/scene-prompt.constant';

describe('CreateVideoPromptService', () => {
  let deepSeekMock: { generate: jest.Mock };
  let service: CreateVideoPromptService;

  beforeEach(() => {
    deepSeekMock = { generate: jest.fn() };
    service = new CreateVideoPromptService(
      deepSeekMock as unknown as DeepSeekService,
    );
  });

  it('builds the image instruction byte-for-byte like the old code', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');

    // Act
    await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: ['Bob', 'Ann'],
      collectionStyle: 'noir comic',
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    const expected = [
      ...SCENE_IMAGE_PROMPT_INSTRUCTIONS,
      buildSceneImageCharactersHint(['Bob', 'Ann']),
      buildSceneStyleHint('noir comic'),
      buildSceneAspectRatioHint(VideoAspectRatio.Vertical),
      '',
      buildSceneLine('a hero walks'),
    ]
      .filter(Boolean)
      .join('\n');

    expect(deepSeekMock.generate).toHaveBeenCalledTimes(1);
    expect(deepSeekMock.generate).toHaveBeenCalledWith({ prompt: expected });
    const [{ prompt: actualPrompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    expect(actualPrompt).toBe(expected);
  });

  it('drops empty hints without leaving stray blank lines', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');

    // Act
    await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: null,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Square,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    const [{ prompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    expect(prompt).not.toContain('Characters present in the scene');
    expect(prompt).not.toContain(
      'Render the image in the following visual style',
    );
    expect(prompt).not.toContain('\n\n');
    const lines = prompt.split('\n');
    expect(lines[lines.length - 1]).toBe('Scene: a hero walks');
  });

  it('returns the DeepSeek text when it is non-empty, with a style suffix', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('A cat walks in a garden.');
    const style = 'anime';

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: style,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    expect(result).toBe(
      `A cat walks in a garden. ${buildSceneStyleTag(style)}`,
    );
    expect(result).toContain('anime');
  });

  it('falls back to the original scenario with a style suffix when DeepSeek returns an empty response', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('');
    const scenario = 'a hero walks';
    const style = 'anime';

    // Act
    const result = await service.buildScenePrompt({
      scenario: scenario,
      characterNames: [],
      collectionStyle: style,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    expect(result).toBe(`${scenario} ${buildSceneStyleTag(style)}`);
    expect(result).toContain('anime');
  });

  it('places the style tag as the last element without a style reference', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('A cinematic scene unfolds.');
    const style = 'anime';

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: style,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    expect(result.endsWith(buildSceneStyleTag(style))).toBe(true);
    expect(result.startsWith('A cinematic scene unfolds.')).toBe(true);
  });

  it('includes the style reference note when hasStyleReference is true', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('Generated text');
    const style = 'anime';

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: style,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: true,
    });

    // Assert
    expect(result).toBe(
      `Generated text ${buildSceneStyleTag(style)} ${SCENE_STYLE_REFERENCE_NOTE}`,
    );
  });

  it('does not include the style reference note when hasStyleReference is false', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('Generated text');
    const style = 'anime';

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: style,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    expect(result).not.toContain(SCENE_STYLE_REFERENCE_NOTE);
  });

  it('does not change the instruction sent to DeepSeek when hasStyleReference parameter is added', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');

    // Act
    await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: ['Bob', 'Ann'],
      collectionStyle: 'noir comic',
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: true,
    });

    // Assert
    const expected = [
      ...SCENE_IMAGE_PROMPT_INSTRUCTIONS,
      buildSceneImageCharactersHint(['Bob', 'Ann']),
      buildSceneStyleHint('noir comic'),
      buildSceneAspectRatioHint(VideoAspectRatio.Vertical),
      '',
      buildSceneLine('a hero walks'),
    ]
      .filter(Boolean)
      .join('\n');

    expect(deepSeekMock.generate).toHaveBeenCalledWith({ prompt: expected });
    const [{ prompt: actualPrompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    expect(actualPrompt).toBe(expected);
    expect(actualPrompt).not.toContain(SCENE_STYLE_REFERENCE_NOTE);
  });

  it('builds the motion instruction byte-for-byte like the old code, without an aspect ratio hint', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');

    // Act
    await service.buildVideoPrompt('a hero walks', ['Bob']);

    // Assert
    const expected = [
      ...SCENE_VIDEO_PROMPT_INSTRUCTIONS,
      buildSceneVideoCharactersHint(['Bob']),
      '',
      buildSceneLine('a hero walks'),
    ]
      .filter(Boolean)
      .join('\n');

    expect(deepSeekMock.generate).toHaveBeenCalledWith({ prompt: expected });
    const [{ prompt: actualPrompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    expect(actualPrompt).toBe(expected);
    expect(expected).not.toContain('aspect ratio frame');
    expect(expected).not.toContain('9:16');
  });

  it('uses a different characters hint text for image and video prompts', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');

    // Act
    await service.buildScenePrompt({
      scenario: 's',
      characterNames: ['Bob'],
      collectionStyle: null,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });
    const [{ prompt: imagePrompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    await service.buildVideoPrompt('s', ['Bob']);
    const [{ prompt: videoPrompt }] = deepSeekMock.generate.mock.calls[1] as [
      { prompt: string },
    ];

    // Assert
    expect(imagePrompt).toContain(
      'keep their appearance consistent with the reference images',
    );
    expect(imagePrompt).not.toContain('keep their appearance unchanged');
    expect(videoPrompt).toContain('keep their appearance unchanged');
    expect(videoPrompt).not.toContain(
      'keep their appearance consistent with the reference images',
    );
  });

  it('includes style description in DeepSeek instruction and in the style tag', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');
    const style = 'noir';
    const description = '2D cel-shading.';

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: style,
      styleDescription: description,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    const [{ prompt: actualPrompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    expect(actualPrompt).toContain(buildSceneStyleHint(style, description));
    expect(result).toContain(buildSceneStyleTag(style, description));
    expect(result).toContain(description);
  });

  it('includes style reference note with anchor and N-1 positions', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: 'noir',
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 1,
      hasStyleAnchor: true,
      hasPreviousScene: true,
    });

    // Assert
    expect(result).toContain('reference image #2');
    expect(result).toContain('reference image #3');
  });

  it('does not include style reference note when neither anchor nor N-1 present', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('generated');

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: 'noir',
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    expect(result).toEqual(`generated ${buildSceneStyleTag('noir')}`);
    expect(result).not.toContain(SCENE_STYLE_REFERENCE_NOTE);
    expect(result).not.toContain('reference image #');
  });

  it('falls back to "<IMAGE_1> comes to life: <scenario>" when DeepSeek returns an empty response', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('');

    // Act
    const result = await service.buildVideoPrompt('a hero walks', []);

    // Assert
    expect(result).toBe('<IMAGE_1> comes to life: a hero walks');
  });

  it('includes character sheet note when characterReferenceCount > 0', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('A scene unfolds');

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: 'noir',
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 2,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    expect(result).toContain(buildSceneCharacterSheetNote(2));
  });

  it('does not include character sheet note when characterReferenceCount is 0', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('A scene unfolds');

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: 'noir',
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      characterReferenceCount: 0,
      hasStyleAnchor: false,
      hasPreviousScene: false,
    });

    // Assert
    expect(result).not.toContain('character sheet');
    expect(result).not.toContain('multi-panel');
  });
});
