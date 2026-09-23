jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('src/ai-providers/deepseek/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import { CharacterCollectionReaderService } from 'src/character-gallery/character-collection-reader.service';
import { ScenarioPlanPromptService } from './scenario-plan-prompt.service';
import { ScenarioPlanService } from './scenario-plan.service';
import { GenerateScenarioPlanRequestDto } from './dto/scenario-plan.dto';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import { VideoPipeRequestDto } from 'src/video-pipe/dto/video-pipe.dto';

describe('ScenarioPlanService', () => {
  let service: ScenarioPlanService;
  let promptServiceMock: {
    generateScenarioPlanText: jest.Mock;
  };
  let readerServiceMock: {
    loadCollectionWithCharacters: jest.Mock;
  };

  const createCharacter = (
    name: string,
    description?: string,
  ): CharacterItemEntity =>
    ({
      id: `char-${name}`,
      name,
      description: description || '',
      imageUrl: '',
      collectionId: 'c-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as CharacterItemEntity;

  beforeEach(async () => {
    promptServiceMock = {
      generateScenarioPlanText: jest.fn(),
    };

    readerServiceMock = {
      loadCollectionWithCharacters: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ScenarioPlanService,
        {
          provide: ScenarioPlanPromptService,
          useValue: promptServiceMock,
        },
        {
          provide: CharacterCollectionReaderService,
          useValue: readerServiceMock,
        },
      ],
    }).compile();

    service = module.get<ScenarioPlanService>(ScenarioPlanService);
  });

  it('returns valid response on happy path', async () => {
    // Arrange
    const characters = [
      createCharacter('Аня', 'brave detective'),
      createCharacter('Борис', 'mysterious stranger'),
    ];
    const collection = { id: 'c-1', style: 'noir', characters };
    const validScenarioPlan = JSON.stringify([
      {
        speakers: ['Аня'],
        text: 'Начало: Аня стоит у входа.\nСередина: Аня входит в кафе.\nКонец: Аня садится за стол.',
      },
      {
        speakers: ['Борис'],
        text: 'Начало: Борис заходит с улицы.\nСередина: Борис сидит за столом.\nКонец: Борис заказывает кофе.',
      },
      {
        speakers: ['Аня', 'Борис'],
        text: 'Начало: Аня и Борис за одним столом.\nСередина: Аня и Борис разговаривают.\nКонец: Аня и Борис прощаются.',
      },
    ]);

    readerServiceMock.loadCollectionWithCharacters.mockResolvedValue({
      collection,
      characters,
    });
    promptServiceMock.generateScenarioPlanText.mockResolvedValue(
      validScenarioPlan,
    );

    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'Two detectives meet';
    dto.collectionId = 'c-1';
    dto.sceneCount = 3;
    dto.aspectRatio = VideoAspectRatio.Vertical;

    // Act
    const result = await service.generateScenarioPlan(dto);

    // Assert
    expect(result.scenarios).toHaveLength(3);
    expect(result.scenarios[0]).toBe(
      'Начало: Аня стоит у входа.\nСередина: Аня входит в кафе.\nКонец: Аня садится за стол.',
    );
    expect(result.collectionId).toBe('c-1');
    expect(result.aspectRatio).toBe(VideoAspectRatio.Vertical);
    expect(result.scenes).toHaveLength(3);
    expect(result.scenes[0].speakers).toEqual(['Аня']);

    // Verify compatibility with VideoPipeRequestDto
    const videoPipeDto = plainToInstance(VideoPipeRequestDto, {
      scenarios: result.scenarios,
      collectionId: result.collectionId,
      aspectRatio: result.aspectRatio,
    });
    const errors = await validate(videoPipeDto);
    expect(errors).toHaveLength(0);
  });

  it('does not populate aspectRatio if not provided', async () => {
    // Arrange
    const characters = [createCharacter('Аня', 'detective')];
    const collection = { id: 'c-1', style: 'noir', characters };
    const validScenarioPlan = JSON.stringify([
      {
        speakers: ['Аня'],
        text: 'Начало: Аня стоит у входа.\nСередина: Аня входит в кафе.\nКонец: Аня садится за стол.',
      },
    ]);

    readerServiceMock.loadCollectionWithCharacters.mockResolvedValue({
      collection,
      characters,
    });
    promptServiceMock.generateScenarioPlanText.mockResolvedValue(
      validScenarioPlan,
    );

    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'A detective story';
    dto.collectionId = 'c-1';
    dto.sceneCount = 1;

    // Act
    const result = await service.generateScenarioPlan(dto);

    // Assert
    expect(result.aspectRatio).toBeUndefined();
  });

  it('rejects empty character collection before calling LLM', async () => {
    // Arrange
    const collection = { id: 'c-1', style: 'noir', characters: [] };
    readerServiceMock.loadCollectionWithCharacters.mockResolvedValue({
      collection,
      characters: [],
    });

    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'A detective story';
    dto.collectionId = 'c-1';
    dto.sceneCount = 1;

    // Act & Assert
    await expect(service.generateScenarioPlan(dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(promptServiceMock.generateScenarioPlanText).not.toHaveBeenCalled();
  });

  it('propagates collection loading errors', async () => {
    // Arrange
    readerServiceMock.loadCollectionWithCharacters.mockRejectedValue(
      new NotFoundException('Character collection not found.'),
    );

    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'A detective story';
    dto.collectionId = 'c-1';
    dto.sceneCount = 1;

    // Act & Assert
    await expect(service.generateScenarioPlan(dto)).rejects.toThrow(
      NotFoundException,
    );
    expect(promptServiceMock.generateScenarioPlanText).not.toHaveBeenCalled();
  });

  it('retries once and succeeds when invalid response is fixed', async () => {
    // Arrange
    const characters = [createCharacter('Аня', 'detective')];
    const collection = { id: 'c-1', style: 'noir', characters };

    readerServiceMock.loadCollectionWithCharacters.mockResolvedValue({
      collection,
      characters,
    });

    const invalidPlan = JSON.stringify([
      { speakers: ['Аня'], text: 'Аня входит в кафе.' },
      { speakers: ['Аня'], text: 'Аня сидит за столом.' },
    ]); // Only 2 scenes, expected 3

    const validPlan = JSON.stringify([
      {
        speakers: ['Аня'],
        text: 'Начало: Аня стоит у входа.\nСередина: Аня входит в кафе.\nКонец: Аня садится за стол.',
      },
      {
        speakers: ['Аня'],
        text: 'Начало: Аня за столом.\nСередина: Аня сидит за столом.\nКонец: Аня встаёт из-за стола.',
      },
      {
        speakers: ['Аня'],
        text: 'Начало: Аня у выхода.\nСередина: Аня уходит из кафе.\nКонец: Аня выходит на улицу.',
      },
    ]); // 3 scenes as expected

    promptServiceMock.generateScenarioPlanText
      .mockResolvedValueOnce(invalidPlan)
      .mockResolvedValueOnce(validPlan);

    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'A detective story';
    dto.collectionId = 'c-1';
    dto.sceneCount = 3;

    // Act
    const result = await service.generateScenarioPlan(dto);

    // Assert
    expect(result.scenarios).toHaveLength(3);
    expect(promptServiceMock.generateScenarioPlanText).toHaveBeenCalledTimes(2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const secondCallArgs =
      promptServiceMock.generateScenarioPlanText.mock.calls[1];
    expect(secondCallArgs).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(secondCallArgs[0]?.violations).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(secondCallArgs[0]?.violations?.length).toBeGreaterThan(0);
  });

  it('returns 422 after unsuccessful retry with exactly 2 LLM calls', async () => {
    // Arrange
    const characters = [
      createCharacter('Аня', 'detective'),
      createCharacter('Борис', 'stranger'),
      createCharacter('Виктор', 'another'),
    ];
    const collection = { id: 'c-1', style: 'noir', characters };

    readerServiceMock.loadCollectionWithCharacters.mockResolvedValue({
      collection,
      characters,
    });

    // Both attempts return invalid plan (3 speakers, max is 2)
    const invalidPlan = JSON.stringify([
      {
        speakers: ['Аня', 'Борис'],
        text: 'Аня, Борис и Виктор встречаются.',
      },
    ]);

    promptServiceMock.generateScenarioPlanText
      .mockResolvedValueOnce(invalidPlan)
      .mockResolvedValueOnce(invalidPlan);

    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'A detective story';
    dto.collectionId = 'c-1';
    dto.sceneCount = 1;

    // Act & Assert
    await expect(service.generateScenarioPlan(dto)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(promptServiceMock.generateScenarioPlanText).toHaveBeenCalledTimes(2);
  });

  it('handles unparseable response (invalid JSON) with same retry logic', async () => {
    // Arrange
    const characters = [createCharacter('Аня', 'detective')];
    const collection = { id: 'c-1', style: 'noir', characters };

    readerServiceMock.loadCollectionWithCharacters.mockResolvedValue({
      collection,
      characters,
    });

    promptServiceMock.generateScenarioPlanText
      .mockResolvedValueOnce('извините, не могу')
      .mockResolvedValueOnce('не работает');

    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'A detective story';
    dto.collectionId = 'c-1';
    dto.sceneCount = 1;

    // Act & Assert
    await expect(service.generateScenarioPlan(dto)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(promptServiceMock.generateScenarioPlanText).toHaveBeenCalledTimes(2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const secondCallArgs =
      promptServiceMock.generateScenarioPlanText.mock.calls[1];
    expect(secondCallArgs).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(secondCallArgs[0]?.violations).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const hasJSONError = secondCallArgs[0]?.violations?.some((v: string) =>
      v.includes('JSON'),
    );
    expect(hasJSONError).toBeTruthy();
  });
});
