import { Injectable } from '@nestjs/common';
import { createDeepSeek, DeepSeekProvider } from '@ai-sdk/deepseek';
import { DEEPSEEK_API_KEY } from 'src/shared/constants/config';
import { generateText } from 'ai';
import { deepSeekModels } from 'src/shared/constants/deepseek';
import { AppLoggerService } from 'src/shared/logger/logger.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { GenerateParams } from '../types/deepseek.types';

@LogMethods()
@Injectable()
export class DeepSeekService {
  private readonly deepseekSource: DeepSeekProvider;

  constructor(private readonly logger: AppLoggerService) {
    this.deepseekSource = createDeepSeek({
      apiKey: DEEPSEEK_API_KEY,
    });
  }

  async generate({ model = deepSeekModels.v4Pro, prompt }: GenerateParams) {
    const result = await this.logger.trackExternalCall(
      {
        provider: 'deepseek',
        operation: 'generateText',
        request: { model, promptLength: prompt.length, prompt },
      },
      () =>
        generateText({
          model: this.deepseekSource.languageModel(model),
          prompt,
        }),
      (response) => ({
        finishReason: response.finishReason,
        usage: response.usage,
        textLength: response.text?.length ?? 0,
      }),
    );

    return result.text || '';
  }
}
