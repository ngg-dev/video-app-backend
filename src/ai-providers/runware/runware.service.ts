import { Injectable } from '@nestjs/common';
import { RUNWARE_API_KEY } from 'src/shared/constants/config';
import {
  runwareImageModels,
  runwareTextModels,
  runwareVideoModels,
} from 'src/shared/constants/runware';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { isNotNull, isNull } from 'src/shared/utils';
import { createRunwareClient } from './runware-client.factory';
import {
  GenerateImageParams,
  GenerateTextParams,
  GenerateVideoParams,
  RunwareClient,
  RunwareRunResult,
} from './types/runware.types';
import {
  buildImageInferenceParams,
  buildTextInferenceParams,
  buildVideoInferenceParams,
} from './utils/runware-request-builders.util';
import {
  extractCost,
  extractImageUrl,
  extractText,
  extractVideoUrl,
} from './utils/runware-response.util';

@LogMethods()
@Injectable()
export class RunwareService {
  private clientPromise: Promise<RunwareClient> | null = null;

  constructor(private readonly logger: AppLoggerService) {}

  private getClient(): Promise<RunwareClient> {
    if (isNull(this.clientPromise)) {
      const promise = createRunwareClient(RUNWARE_API_KEY);
      this.clientPromise = promise;
      promise.catch(() => {
        if (this.clientPromise === promise) {
          this.clientPromise = null;
        }
      });
    }
    return this.clientPromise;
  }

  private async runParams(params: object): Promise<RunwareRunResult[]> {
    const client = await this.getClient();
    return await client.run(params);
  }

  async generateText({
    model = runwareTextModels.gemma4_31b,
    prompt,
  }: GenerateTextParams): Promise<string | null> {
    const params = buildTextInferenceParams({ model, prompt });
    const results = await this.logger.trackExternalCall(
      {
        provider: 'runware',
        operation: 'generateText',
        request: { model, promptLength: prompt.length, prompt },
      },
      () => this.runParams(params),
      (response) => {
        const first = response[0];
        return {
          finishReason: first?.finishReason,
          usage: first?.usage,
          textLength: extractText(response)?.length ?? 0,
          cost: extractCost(response),
        };
      },
    );
    return extractText(results);
  }

  async generateImage({
    model = runwareImageModels.flux2Dev,
    prompt,
    referenceImages,
    width,
    height,
  }: GenerateImageParams): Promise<string | null> {
    const params = buildImageInferenceParams({
      model,
      prompt,
      referenceImages,
      width,
      height,
    });
    const results = await this.logger.trackExternalCall(
      {
        provider: 'runware',
        operation: 'generateImage',
        request: {
          model,
          promptLength: prompt.length,
          prompt,
          referenceImagesCount: referenceImages?.length ?? 0,
          width: params.width,
          height: params.height,
        },
      },
      () => this.runParams(params),
      (response) => ({
        hasImageUrl: isNotNull(extractImageUrl(response)),
        cost: extractCost(response),
        resultsCount: response.length,
      }),
    );
    return extractImageUrl(results);
  }

  async generateVideo({
    model = runwareVideoModels.seedance20,
    prompt,
    referenceImageUrls,
    aspectRatio,
    duration,
  }: GenerateVideoParams): Promise<string | null> {
    const params = buildVideoInferenceParams({
      model,
      prompt,
      referenceImageUrls,
      aspectRatio,
      duration,
    });
    const results = await this.logger.trackExternalCall(
      {
        provider: 'runware',
        operation: 'generateVideo',
        request: {
          model,
          promptLength: prompt.length,
          prompt,
          referenceImagesCount: referenceImageUrls?.length ?? 0,
          aspectRatio,
          duration: params.duration,
        },
      },
      () => this.runParams(params),
      (response) => ({
        hasVideoUrl: isNotNull(extractVideoUrl(response)),
        cost: extractCost(response),
        resultsCount: response.length,
      }),
    );
    return extractVideoUrl(results);
  }
}
