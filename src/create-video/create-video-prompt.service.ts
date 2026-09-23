import { Injectable } from '@nestjs/common';
import { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import {
  SCENE_IMAGE_PROMPT_INSTRUCTIONS,
  SCENE_STYLE_REFERENCE_NOTE,
  SCENE_VIDEO_PROMPT_INSTRUCTIONS,
  buildSceneAspectRatioHint,
  buildSceneImageCharactersHint,
  buildSceneLine,
  buildSceneStyleHint,
  buildSceneStyleTag,
  buildSceneVideoCharactersHint,
  buildVideoPromptFallback,
} from './constants/scene-prompt.constant';

@LogMethods()
@Injectable()
export class CreateVideoPromptService {
  constructor(private readonly deepSeekService: DeepSeekService) {}

  async buildScenePrompt(
    scenario: string,
    characterNames: string[],
    collectionStyle: string | null,
    aspectRatio: VideoAspectRatio,
    hasStyleReference: boolean,
  ): Promise<string> {
    const charactersHint = buildSceneImageCharactersHint(characterNames);
    const styleHint = buildSceneStyleHint(collectionStyle);
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

    const styleTag = buildSceneStyleTag(collectionStyle);
    const referenceNote = hasStyleReference ? SCENE_STYLE_REFERENCE_NOTE : '';

    return [generatedPrompt || scenario, styleTag, referenceNote]
      .filter(Boolean)
      .join(' ');
  }

  async buildVideoPrompt(
    scenario: string,
    characterNames: string[],
  ): Promise<string> {
    const charactersHint = buildSceneVideoCharactersHint(characterNames);

    const instruction = [
      ...SCENE_VIDEO_PROMPT_INSTRUCTIONS,
      charactersHint,
      '',
      buildSceneLine(scenario),
    ]
      .filter(Boolean)
      .join('\n');

    const generatedPrompt = await this.deepSeekService.generate({
      prompt: instruction,
    });

    return generatedPrompt || buildVideoPromptFallback(scenario);
  }
}
