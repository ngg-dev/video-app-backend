import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CharacterCollectionReaderService } from 'src/character-gallery/character-collection-reader.service';
import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { isNull } from 'src/shared/utils';
import { ScenarioPlanPromptService } from './scenario-plan-prompt.service';
import {
  GenerateScenarioPlanRequestDto,
  ScenarioPlanResponseDto,
} from './dto/scenario-plan.dto';
import {
  ParsedScene,
  collectScenarioPlanViolations,
  parseScenarioPlan,
  toGeneratedScenes,
} from './utils/scenario-plan-parse.util';

const UNPARSABLE_RESPONSE_VIOLATION =
  'Ответ модели не является JSON-массивом сцен ожидаемой формы (см. инструкцию формата).';

@LogMethods()
@Injectable()
export class ScenarioPlanService {
  constructor(
    private readonly scenarioPlanPromptService: ScenarioPlanPromptService,
    private readonly characterCollectionReaderService: CharacterCollectionReaderService,
  ) {}

  async generateScenarioPlan(
    dto: GenerateScenarioPlanRequestDto,
  ): Promise<ScenarioPlanResponseDto> {
    const { collection, characters } =
      await this.characterCollectionReaderService.loadCollectionWithCharacters(
        dto.collectionId,
      );

    if (characters.length === 0) {
      throw new BadRequestException(
        'Character collection has no characters. Add at least one character to the collection before generating a scenario plan.',
      );
    }

    const { scenes, violations } = await this.attemptGeneration({
      idea: dto.idea,
      characters,
      collectionStyle: collection.style,
      sceneCount: dto.sceneCount,
      violations: undefined,
    });

    if (violations.length > 0) {
      const { scenes: repairedScenes, violations: repairedViolations } =
        await this.attemptGeneration({
          idea: dto.idea,
          characters,
          collectionStyle: collection.style,
          sceneCount: dto.sceneCount,
          violations,
        });

      if (repairedViolations.length > 0) {
        throw new UnprocessableEntityException(
          `Generated scenario plan is invalid: ${repairedViolations.join('; ')}`,
        );
      }

      return this.buildResponse(dto, repairedScenes, characters);
    }

    return this.buildResponse(dto, scenes, characters);
  }

  private async attemptGeneration(params: {
    idea: string;
    characters: CharacterItemEntity[];
    collectionStyle: string;
    sceneCount: number;
    violations: string[] | undefined;
  }): Promise<{ scenes: ParsedScene[]; violations: string[] }> {
    const { idea, characters, collectionStyle, sceneCount, violations } =
      params;

    const raw = await this.scenarioPlanPromptService.generateScenarioPlanText({
      idea,
      characters,
      collectionStyle,
      sceneCount,
      violations,
    });

    const parsed = parseScenarioPlan(raw);

    if (isNull(parsed)) {
      return { scenes: [], violations: [UNPARSABLE_RESPONSE_VIOLATION] };
    }

    return {
      scenes: parsed,
      violations: collectScenarioPlanViolations(parsed, characters, sceneCount),
    };
  }

  private buildResponse(
    dto: GenerateScenarioPlanRequestDto,
    scenes: ParsedScene[],
    characters: CharacterItemEntity[],
  ): ScenarioPlanResponseDto {
    return {
      scenarios: scenes.map((scene) => scene.text),
      collectionId: dto.collectionId,
      aspectRatio: dto.aspectRatio,
      scenes: toGeneratedScenes(scenes, characters),
    };
  }
}
