jest.mock('src/ai-providers/deepseek/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

import { ScenarioPlanPromptService } from './scenario-plan-prompt.service';
import type { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import { SCENARIO_PLAN_INSTRUCTIONS } from './constants/scenario-plan.constant';

describe('ScenarioPlanPromptService', () => {
  let deepSeekMock: { generate: jest.Mock };
  let service: ScenarioPlanPromptService;

  const createCharacter = (
    name: string,
    description: string,
  ): CharacterItemEntity =>
    ({
      id: `char-${name}`,
      name,
      appearance: {
        ageAndGender: description,
        face: 'face',
        hair: 'hair',
        build: 'build',
        outfit: 'outfit',
        footwear: 'footwear',
        accessories: 'accessories',
        palette: 'palette',
      },
      imageUrl: '',
      collectionId: 'c-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as CharacterItemEntity;

  beforeEach(() => {
    deepSeekMock = { generate: jest.fn().mockResolvedValue('[]') };
    service = new ScenarioPlanPromptService(
      deepSeekMock as unknown as DeepSeekService,
    );
  });

  it('assembles prompt with instructions, roster, style, scene count and idea', async () => {
    // Arrange
    const characters = [
      createCharacter('Аня', 'brave detective'),
      createCharacter('Борис', 'mysterious stranger'),
    ];
    const collectionStyle = 'noir black and white';
    const idea = 'Two detectives meet in a rainy street';
    const sceneCount = 3;

    // Act
    await service.generateScenarioPlanText({
      idea,
      characters,
      collectionStyle,
      sceneCount,
    });

    // Assert
    expect(deepSeekMock.generate).toHaveBeenCalledTimes(1);
    const [{ prompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];

    // Check for instructions
    SCENARIO_PLAN_INSTRUCTIONS.forEach((instruction) => {
      expect(prompt).toContain(instruction);
    });

    // Check for character names
    expect(prompt).toContain('Аня');
    expect(prompt).toContain('Борис');

    // Check for style
    expect(prompt).toContain(collectionStyle);

    // Check for scene count
    expect(prompt).toContain('3');

    // Check for idea
    expect(prompt).toContain(idea);

    // Check no double newlines
    expect(prompt).not.toContain('\n\n');
  });

  it('includes repair hint only on retry with violations', async () => {
    // Arrange
    const characters = [createCharacter('Аня', 'brave detective')];
    const collectionStyle = 'noir';
    const idea = 'A detective story';
    const sceneCount = 2;

    // Act - first call without violations
    await service.generateScenarioPlanText({
      idea,
      characters,
      collectionStyle,
      sceneCount,
    });

    const [{ prompt: firstPrompt }] = deepSeekMock.generate.mock.calls[0] as [
      { prompt: string },
    ];

    // Act - second call with violations
    const violations = ['сцена 1: заявлен говорящий Аня, но его нет в тексте'];
    await service.generateScenarioPlanText({
      idea,
      characters,
      collectionStyle,
      sceneCount,
      violations,
    });

    const [{ prompt: secondPrompt }] = deepSeekMock.generate.mock.calls[1] as [
      { prompt: string },
    ];

    // Assert
    expect(firstPrompt).not.toContain(
      'заявлен говорящий Аня, но его нет в тексте',
    );
    expect(secondPrompt).toContain(
      'заявлен говорящий Аня, но его нет в тексте',
    );
    expect(secondPrompt).toContain('Предыдущий ответ был некорректным');
  });
});
