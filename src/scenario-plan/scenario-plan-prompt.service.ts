import { Injectable } from '@nestjs/common';
import { DeepSeekService } from '@ai-providers/deepseek/services/deepseek.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import {
  SCENARIO_PLAN_INSTRUCTIONS,
  buildScenarioPlanIdeaLine,
  buildScenarioPlanRepairHint,
  buildScenarioPlanRosterHint,
  buildScenarioPlanSceneCountHint,
  buildScenarioPlanStyleHint,
} from './constants/scenario-plan.constant';

@LogMethods()
@Injectable()
export class ScenarioPlanPromptService {
  constructor(private readonly deepSeekService: DeepSeekService) {}

  async generateScenarioPlanText(params: {
    idea: string;
    characters: CharacterItemEntity[];
    collectionStyle: string;
    sceneCount: number;
    violations?: string[];
  }): Promise<string> {
    const { idea, characters, collectionStyle, sceneCount, violations } =
      params;

    const sceneCountHint = buildScenarioPlanSceneCountHint(sceneCount);
    const styleHint = buildScenarioPlanStyleHint(collectionStyle);
    const rosterHint = buildScenarioPlanRosterHint(characters);
    const repairHint = buildScenarioPlanRepairHint(violations ?? []);

    const prompt = [
      ...SCENARIO_PLAN_INSTRUCTIONS,
      sceneCountHint,
      styleHint,
      rosterHint,
      repairHint,
      '',
      buildScenarioPlanIdeaLine(idea),
    ]
      .filter(Boolean)
      .join('\n');

    return this.deepSeekService.generate({ prompt });
  }
}
