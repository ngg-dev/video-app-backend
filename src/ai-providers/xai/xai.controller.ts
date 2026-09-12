import { Body, Controller, Post } from '@nestjs/common';
import { XaiService } from './xai.service';
import { GenerateRequestDto, GenerateResponsetDto } from './dto/xai.dto';

@Controller('xai')
export class XaiController {
  constructor(private readonly xaiService: XaiService) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateRequestDto,
  ): Promise<GenerateResponsetDto> {
    const message = await this.xaiService.generate({
      prompt: body.prompt,
    });
    return { message };
  }
}
