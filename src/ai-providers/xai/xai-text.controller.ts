import { Body, Controller, Post } from '@nestjs/common';
import { XaiService } from './xai.service';
import {
  GenerateTextRequestDto,
  GenerateTextResponseDto,
} from './dto/xai-text.dto';

@Controller('xai/text')
export class XaiTextController {
  constructor(private readonly xaiService: XaiService) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateTextRequestDto,
  ): Promise<GenerateTextResponseDto> {
    const message = await this.xaiService.generate({
      prompt: body.prompt,
    });
    return { message: message ?? '' };
  }
}
