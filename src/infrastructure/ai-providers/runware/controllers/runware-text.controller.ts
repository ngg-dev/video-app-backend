import { Body, Controller, Post } from '@nestjs/common';
import { RunwareService } from '../services/runware.service';
import {
  GenerateTextRequestDto,
  GenerateTextResponseDto,
} from '../dto/runware-text.dto';

@Controller('runware/text')
export class RunwareTextController {
  constructor(private readonly runwareService: RunwareService) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateTextRequestDto,
  ): Promise<GenerateTextResponseDto> {
    const message = await this.runwareService.generateText({
      prompt: body.prompt,
    });
    return { message: message ?? '' };
  }
}
