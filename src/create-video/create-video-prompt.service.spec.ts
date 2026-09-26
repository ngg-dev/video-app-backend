jest.mock('@ai-providers/deepseek/services/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

import { CreateVideoPromptService } from './create-video-prompt.service';
import type { DeepSeekService } from '@ai-providers/deepseek/services/deepseek.service';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import {
  SCENE_IMAGE_PROMPT_INSTRUCTIONS,
  SCENE_VIDEO_PROMPT_INSTRUCTIONS,
  SCENE_VIDEO_NO_SPEECH_RULE,
  SCENE_VIDEO_STATIC_CAMERA_RULE,
  buildSceneImageCharactersHint,
  buildSceneVideoCharactersHint,
  buildSceneStyleHint,
  buildSceneAspectRatioHint,
  buildSceneLine,
  buildSceneStyleTag,
  SCENE_CHARACTER_SHEET_FRAME_NOTE,
} from './constants/scene-prompt.constant';
import { buildSceneReferenceBlock } from './utils/scene-reference.util';

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
      references: [],
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
      references: [],
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
    expect(lines[lines.length - 1]).toBe('Сцена: a hero walks');
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
      references: [],
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
      references: [],
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
      references: [],
    });

    // Assert
    expect(result.endsWith(buildSceneStyleTag(style))).toBe(true);
    expect(result.startsWith('A cinematic scene unfolds.')).toBe(true);
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
      references: [],
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
      'сохраняй их внешность согласованной с референсами',
    );
    expect(imagePrompt).not.toContain('сохраняй их внешность неизменной');
    expect(videoPrompt).not.toContain('сохраняй их внешность согласованной');
    expect(videoPrompt).toContain('Персонажи в сцене: ');
    expect(videoPrompt).not.toContain(
      'сохраняй их внешность согласованной с референсами',
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
      references: [],
    });

    // Assert
    const [{ prompt: actualPrompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    expect(actualPrompt).toContain(buildSceneStyleHint(style, description));
    expect(result).toContain(buildSceneStyleTag(style, description));
    expect(result).toContain(description);
  });

  it('falls back to "<IMAGE_1> оживает: <scenario>" when DeepSeek returns an empty response', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('');

    // Act
    const result = await service.buildVideoPrompt('a hero walks', []);

    // Assert
    expect(result).toBe(
      `<IMAGE_1> оживает: a hero walks ${SCENE_VIDEO_NO_SPEECH_RULE} ${SCENE_VIDEO_STATIC_CAMERA_RULE}`,
    );
  });

  it('strips camera directions from the scenario for the video prompt only', async () => {
    // Arrange
    const scenario = 'Действие: герой идёт\nКамера: средний план, наезд';
    deepSeekMock.generate.mockResolvedValue('');

    // Act
    const result = await service.buildVideoPrompt(scenario, []);
    const [{ prompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];

    // Assert
    expect(prompt).toContain('Действие: герой идёт');
    expect(prompt).not.toContain('наезд');
    expect(result).not.toContain('наезд');
  });

  // 18. Reference block at the beginning
  it('places the reference block at the beginning of the prompt', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('Generated text');
    const references = [
      { role: 'character' as const, url: 'a.png', name: 'Anna' },
      { role: 'styleAnchor' as const, url: 'anchor.png' },
    ];
    const collectionStyle = 'noir';

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      references,
    });

    // Assert
    const referenceBlock = buildSceneReferenceBlock(references);
    const styleTag = buildSceneStyleTag(collectionStyle);
    const expected = `${referenceBlock}\nGenerated text ${styleTag}`;
    expect(result).toBe(expected);
  });

  // 19. Without references, prompt has no block and no old notes
  it('omits reference block when references are empty', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('Generated text');

    // Act
    const result = await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: 'noir',
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      references: [],
    });

    // Assert
    const styleTag = buildSceneStyleTag('noir');
    expect(result).toBe(`Generated text ${styleTag}`);
    expect(result).not.toContain('Изображение 1');
  });

  // 20. Reference block does not go to DeepSeek instruction
  it('excludes reference block from DeepSeek instruction', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('Generated text');
    const references = [
      { role: 'character' as const, url: 'a.png', name: 'Anna' },
      { role: 'styleAnchor' as const, url: 'anchor.png' },
    ];

    // Act
    await service.buildScenePrompt({
      scenario: 'a hero walks',
      characterNames: [],
      collectionStyle: null,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      references,
    });

    // Assert
    const [{ prompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];
    expect(prompt).not.toContain('Изображение 1');
    expect(prompt).not.toContain(SCENE_CHARACTER_SHEET_FRAME_NOTE);
  });

  // 21. Fallback to scenario preserves the block
  it('preserves reference block when falling back to original scenario', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('');
    const references = [{ role: 'styleAnchor' as const, url: 'anchor.png' }];
    const scenario = 'a hero walks';

    // Act
    const result = await service.buildScenePrompt({
      scenario,
      characterNames: [],
      collectionStyle: null,
      styleDescription: null,
      aspectRatio: VideoAspectRatio.Vertical,
      references,
    });

    // Assert
    const referenceBlock = buildSceneReferenceBlock(references);
    expect(result.startsWith(referenceBlock)).toBe(true);
    expect(result).toContain(scenario);
  });
});
