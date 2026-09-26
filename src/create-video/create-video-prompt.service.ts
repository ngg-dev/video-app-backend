import { Injectable } from '@nestjs/common';
import { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import {
  SCENE_IMAGE_PROMPT_INSTRUCTIONS,
  SCENE_VIDEO_PROMPT_INSTRUCTIONS,
  buildSceneAspectRatioHint,
  buildSceneImageCharactersHint,
  buildSceneLine,
  buildSceneStyleHint,
  buildSceneStyleTag,
  buildSceneVideoCharactersHint,
  buildVideoPromptFallback,
} from './constants/scene-prompt.constant';
import { stripCameraDirections } from './utils/scenario.util';
import { buildSceneReferenceBlock } from './utils/scene-reference.util';
import { BuildScenePromptParams } from './types/create-video.types';

@LogMethods()
@Injectable()
export class CreateVideoPromptService {
  constructor(private readonly deepSeekService: DeepSeekService) {}

  async buildScenePrompt({
    scenario,
    characterNames,
    collectionStyle,
    styleDescription,
    aspectRatio,
    references,
  }: BuildScenePromptParams): Promise<string> {
    const charactersHint = buildSceneImageCharactersHint(characterNames);
    const styleHint = buildSceneStyleHint(collectionStyle, styleDescription);
    const aspectRatioHint = buildSceneAspectRatioHint(aspectRatio);

    const instruction = [
      ...SCENE_IMAGE_PROMPT_INSTRUCTIONS,
      charactersHint,
      styleHint,
      aspectRatioHint,
      '',
      buildSceneLine(scenario),
    ]
      .filter(Boolean)
      .join('\n');

    const generatedPrompt = await this.deepSeekService.generate({
      prompt: instruction,
    });

    const styleTag = buildSceneStyleTag(collectionStyle, styleDescription);
    const referenceBlock = buildSceneReferenceBlock(references);
    const description = [generatedPrompt || scenario, styleTag]
      .filter(Boolean)
      .join(' ');

    return [referenceBlock, description].filter(Boolean).join('\n');
  }

  async buildVideoPrompt(
    scenario: string,
    characterNames: string[],
  ): Promise<string> {
    const charactersHint = buildSceneVideoCharactersHint(characterNames);
    const videoScenario = stripCameraDirections(scenario);

    const instruction = [
      ...SCENE_VIDEO_PROMPT_INSTRUCTIONS,
      charactersHint,
      '',
      buildSceneLine(videoScenario),
    ]
      .filter(Boolean)
      .join('\n');

    const generatedPrompt = await this.deepSeekService.generate({
      prompt: instruction,
    });

    return generatedPrompt || buildVideoPromptFallback(videoScenario);
  }
}
