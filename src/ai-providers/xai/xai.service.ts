import { Injectable } from '@nestjs/common';
import { createXai, xai, XaiProvider } from '@ai-sdk/xai';
import { GeneratedFile, generateImage, generateText } from 'ai';
import { XAI_API_KEY } from 'src/shared/constants/config';
import { xaiModels } from 'src/shared/constants/xai';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { GenerateImageParams, GenerateParams } from './types/xai.types';

@LogMethods()
@Injectable()
export class XaiService {
  private readonly xaiSource: XaiProvider;

  constructor(private readonly logger: AppLoggerService) {
    this.xaiSource = createXai({
      apiKey: XAI_API_KEY,
    });
  }

  async generate({
    model = xaiModels.grok4,
    prompt,
  }: GenerateParams): Promise<string | null> {
    const result = await this.logger.trackExternalCall(
      {
        provider: 'xai',
        operation: 'generateText',
        request: { model, promptLength: prompt.length, prompt },
      },
      () =>
        generateText({
          model: this.xaiSource.languageModel(model),
          prompt,
        }),
      (response) => ({
        finishReason: response.finishReason,
        usage: response.usage,
        textLength: response.text?.length ?? 0,
      }),
    );

    return result.text || null;
  }

  async generateImage({
    model = xaiModels.grok4,
    prompt,
    referenceImages,
    aspectRatio,
  }: GenerateImageParams): Promise<GeneratedFile | null> {
    const hasReferenceImages = !!referenceImages?.length;

    const { image } = await this.logger.trackExternalCall(
      {
        provider: 'xai',
        operation: 'generateImage',
        request: {
          model,
          promptLength: prompt.length,
          prompt,
          referenceImagesCount: referenceImages?.length ?? 0,
        },
      },
      () =>
        generateImage({
          model: xai.image('grok-imagine-image-2.0'),
          prompt: hasReferenceImages
            ? { text: prompt, images: referenceImages }
            : prompt,
          ...(aspectRatio ? { aspectRatio } : {}),
        }),
    );

    return image || null;
  }
}
