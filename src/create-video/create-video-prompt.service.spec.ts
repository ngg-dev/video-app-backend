jest.mock('src/ai-providers/deepseek/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

import { CreateVideoPromptService } from './create-video-prompt.service';
import type { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import {
  SCENE_IMAGE_PROMPT_INSTRUCTIONS,
  SCENE_VIDEO_PROMPT_INSTRUCTIONS,
  buildSceneImageCharactersHint,
  buildSceneVideoCharactersHint,
  buildSceneStyleHint,
  buildSceneAspectRatioHint,
  buildSceneLine,
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
    await service.buildScenePrompt(
      'a hero walks',
      ['Bob', 'Ann'],
      'noir comic',
      VideoAspectRatio.Vertical,
    );

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
    await service.buildScenePrompt(
      'a hero walks',
      [],
      null,
      VideoAspectRatio.Square,
    );

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

  it('returns the DeepSeek text when it is non-empty', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('a rich cinematic paragraph');

    // Act
    const result = await service.buildScenePrompt(
      'a hero walks',
      [],
      null,
      VideoAspectRatio.Vertical,
    );

    // Assert
    expect(result).toBe('a rich cinematic paragraph');
  });

  it('falls back to the original scenario when DeepSeek returns an empty response', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('');

    // Act
    const result = await service.buildScenePrompt(
      'a hero walks',
      [],
      null,
      VideoAspectRatio.Vertical,
    );

    // Assert
    expect(result).toBe('a hero walks');
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
    await service.buildScenePrompt(
      's',
      ['Bob'],
      null,
      VideoAspectRatio.Vertical,
    );
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

  it('falls back to "<IMAGE_1> comes to life: <scenario>" when DeepSeek returns an empty response', async () => {
    // Arrange
    deepSeekMock.generate.mockResolvedValue('');

    // Act
    const result = await service.buildVideoPrompt('a hero walks', []);

    // Assert
    expect(result).toBe('<IMAGE_1> comes to life: a hero walks');
  });
});
