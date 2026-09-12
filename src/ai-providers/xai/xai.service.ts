import { Injectable } from '@nestjs/common';
import { createXai, XaiProvider } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { XAI_API_KEY } from '../../shared/constants/config';
import { xaiModels } from '../../shared/constants/xai';
import { AppLoggerService } from '../../shared/logger/logger.service';
import { LogMethods } from '../../shared/logger/log-methods.decorator';

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
  }: {
    model?: string;
    prompt: string;
  }) {
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

    return result.text || '';
  }
}
