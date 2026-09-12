import { Injectable } from '@nestjs/common';
import { CreateRequestDto } from './dto/create-video.dto';
import { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { SCENARIO_GENERATE_PROMPT } from 'src/shared/constants/create-video';

@Injectable()
export class CreateVideoService {
  constructor(private readonly deepSeekService: DeepSeekService) {}

  async createVideoPipe(data: CreateRequestDto): Promise<string> {
    const prompt = `${SCENARIO_GENERATE_PROMPT}\n${data?.scenario}`;
    const res = await this.deepSeekService.generate({ prompt });
    return res;
  }
}
