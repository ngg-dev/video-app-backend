import { Body, Controller, Post } from '@nestjs/common';
import { VideoPipeService } from './video-pipe.service';
import {
  VideoPipeRequestDto,
  VideoPipeResponseDto,
} from './dto/video-pipe.dto';

@Controller('video-pipe')
export class VideoPipeController {
  constructor(private readonly videoPipeService: VideoPipeService) {}

  @Post('create')
  async create(
    @Body() body: VideoPipeRequestDto,
  ): Promise<VideoPipeResponseDto> {
    return this.videoPipeService.createVideoPipeline(body);
  }
}
