import { Injectable } from '@nestjs/common';
import { CreateRequestDto } from './dto/create-video.dto';
import { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { SCENARIO_GENERATE_PROMPT } from 'src/shared/constants/create-video';

@Injectable()
export class CreateVideoService {
  constructor(
    private readonly deepSeekService: DeepSeekService,
    private readonly xaiService: XaiService,
  ) {}

  async createVideoPipe(data: CreateRequestDto): Promise<string> {
    const prompt = `${SCENARIO_GENERATE_PROMPT}\n${data?.scenario}`;
    const res = await this.deepSeekService.generate({ prompt });
    return res;
  }
}
