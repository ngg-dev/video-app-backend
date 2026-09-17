import { Body, Controller, Post } from '@nestjs/common';
import {
  CreateRequestDto,
  CreateVideoResponseDto,
} from './dto/create-video.dto';
import { CreateVideoService } from './create-video.service';

@Controller('create-video')
export class CreateVideoController {
  constructor(private readonly createVideoService: CreateVideoService) {}

  @Post('create')
  async creaate(
    @Body() body: CreateRequestDto,
  ): Promise<CreateVideoResponseDto> {
    return await this.createVideoService.createVideoPipe(body);
  }
}
