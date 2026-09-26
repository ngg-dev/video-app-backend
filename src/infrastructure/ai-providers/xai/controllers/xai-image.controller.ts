import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { XaiService } from '../services/xai.service';
import {
  GenerateImageRequestDto,
  GenerateImageResponseDto,
} from '../dto/xai-image.dto';

@Controller('xai/image')
export class XaiImageController {
  constructor(private readonly xaiService: XaiService) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateImageRequestDto,
  ): Promise<GenerateImageResponseDto> {
    const image = await this.xaiService.generateImage({
      prompt: body.prompt,
      referenceImages: body.referenceImages,
      aspectRatio: body.aspectRatio,
    });

    if (!image) {
      throw new InternalServerErrorException('Image generation failed.');
    }

    return { base64: image.base64, mediaType: image.mediaType };
  }
}
