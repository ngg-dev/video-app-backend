import { Injectable } from '@nestjs/common';
import { createDeepSeek, DeepSeekProvider } from '@ai-sdk/deepseek';
import { DEEPSEEK_API_KEY } from 'src/shared/constants/config';
import { generateText } from 'ai';
import { deepSeekModels } from 'src/shared/constants/deepseek';

@Injectable()
export class DeepSeekService {
  private readonly deepseekSource: DeepSeekProvider;

  constructor() {
    this.deepseekSource = createDeepSeek({
      apiKey: DEEPSEEK_API_KEY,
    });
  }

  async generate({
    model = deepSeekModels.v4Pro,
    prompt,
  }: {
    model?: string;
    prompt: string;
  }) {
    const { text } = await generateText({
      model: this.deepseekSource.languageModel(model),
      prompt,
    });

    return text || '';
  }
}
