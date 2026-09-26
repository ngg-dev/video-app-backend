import { Body, Controller, Post } from '@nestjs/common';
import { DeepSeekService } from '../services/deepseek.service';
import { GenerateRequestDto, GenerateResponsetDto } from '../dto/deepseek.dto';

@Controller('deepseek')
export class DeepSeekController {
  constructor(private readonly deepSeekService: DeepSeekService) {}

  @Post('generate')
  async gerenatete(
    @Body() body: GenerateRequestDto,
  ): Promise<GenerateResponsetDto> {
    const message = await this.deepSeekService.generate({
      prompt: body.prompt,
    });
    return { message };
  }
}
