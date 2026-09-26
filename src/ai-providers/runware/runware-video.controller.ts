import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { RunwareService } from './runware.service';
import {
  GenerateVideoRequestDto,
  GenerateVideoResponseDto,
} from './dto/runware-video.dto';

@Controller('runware/video')
export class RunwareVideoController {
  constructor(private readonly runwareService: RunwareService) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateVideoRequestDto,
  ): Promise<GenerateVideoResponseDto> {
    const videoUrl = await this.runwareService.generateVideo({
      prompt: body.prompt,
      referenceImageUrls: body.referenceImageUrls,
      aspectRatio: body.aspectRatio,
      duration: body.duration,
    });

    if (!videoUrl) {
      throw new InternalServerErrorException('Video generation failed.');
    }

    return { videoUrl };
  }
}
