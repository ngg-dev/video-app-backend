import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { RunwareService } from './runware.service';
import {
  GenerateImageRequestDto,
  GenerateImageResponseDto,
} from './dto/runware-image.dto';

@Controller('runware/image')
export class RunwareImageController {
  constructor(private readonly runwareService: RunwareService) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateImageRequestDto,
  ): Promise<GenerateImageResponseDto> {
    const imageUrl = await this.runwareService.generateImage({
      prompt: body.prompt,
      referenceImages: body.referenceImages,
      width: body.width,
      height: body.height,
    });

    if (!imageUrl) {
      throw new InternalServerErrorException('Image generation failed.');
    }

    return { imageUrl };
  }
}
