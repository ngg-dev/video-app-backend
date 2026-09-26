import { Injectable } from '@nestjs/common';
import { createXai, xai, XaiProvider } from '@ai-sdk/xai';
import {
  experimental_generateVideo as generateVideo,
  GeneratedFile,
  generateImage,
  generateText,
} from 'ai';
import { XAI_API_KEY } from 'src/shared/constants/config';
import {
  xaiImageModels,
  xaiModels,
  xaiVideoModels,
} from 'src/shared/constants/xai';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import {
  GenerateImageParams,
  GenerateParams,
  GenerateVideoParams,
  XaiGeneratedVideo,
} from '../types/xai.types';
import {
  buildGenerateImageOptions,
  buildGenerateVideoOptions,
} from '../utils/xai-request-builders.util';

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
    resolution,
  }: GenerateImageParams): Promise<GeneratedFile | null> {
    const { image } = await this.logger.trackExternalCall(
      {
        provider: 'xai',
        operation: 'generateImage',
        request: {
          model,
          promptLength: prompt.length,
          prompt,
          referenceImagesCount: referenceImages?.length ?? 0,
          aspectRatio,
          resolution,
        },
      },
      () =>
        generateImage({
          model: xai.image(xaiImageModels.grokImagineImage20),
          ...buildGenerateImageOptions({
            prompt,
            referenceImages,
            aspectRatio,
            resolution,
          }),
        }),
    );

    return image || null;
  }

  async generateVideo({
    model = xaiVideoModels.grokImagineVideo15,
    prompt,
    referenceImageUrls,
    resolution,
    duration,
  }: GenerateVideoParams): Promise<XaiGeneratedVideo | null> {
    const { video, providerMetadata } = await this.logger.trackExternalCall(
      {
        provider: 'xai',
        operation: 'generateVideo',
        request: {
          model,
          promptLength: prompt.length,
          prompt,
          referenceImagesCount: referenceImageUrls.length,
          duration,
        },
      },
      () =>
        generateVideo({
          model: this.xaiSource.video(model),
          ...buildGenerateVideoOptions({
            prompt,
            referenceImageUrls,
            resolution,
            duration,
          }),
        }),
      ({ video, providerMetadata }) => ({
        hasVideoUrl: typeof providerMetadata?.xai?.videoUrl === 'string',
        mediaType: video?.mediaType,
      }),
    );

    if (!video) {
      return null;
    }

    const rawVideoUrl = providerMetadata?.xai?.videoUrl;
    const videoUrl =
      typeof rawVideoUrl === 'string' && rawVideoUrl.length > 0
        ? rawVideoUrl
        : null;

    return { video, videoUrl };
  }
}
