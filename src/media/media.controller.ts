import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MediaService } from 'src/media/media.service';
import { VideoAssemblyService } from 'src/media/video-assembly.service';
import { TrimToShortsRequestDto } from 'src/media/dto/trim-to-shorts-request.dto';
import { ConcatRequestDto } from 'src/media/dto/concat-request.dto';
import { ConcatAndGetUrlRequestDto } from 'src/media/dto/concat-and-get-url-request.dto';
import { ConcatNormalizedVerticalRequestDto } from 'src/media/dto/concat-normalized-vertical-request.dto';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly videoAssemblyService: VideoAssemblyService,
  ) {}

  /**
   * Crop video to 9:16 (YouTube Shorts). Optional time range (Shorts max 60s).
   */
  @Post('trim-to-shorts')
  @HttpCode(HttpStatus.OK)
  async trimToShorts(@Body() body: TrimToShortsRequestDto) {
    const { inputPath, outputPath, ...opts } = body;
    await this.mediaService.trimToShorts(inputPath, outputPath, opts);
    return { ok: true, outputPath };
  }

  /**
   * Concatenate multiple videos into one (same codec/resolution recommended).
   */
  @Post('concat')
  @HttpCode(HttpStatus.OK)
  async concat(@Body() body: ConcatRequestDto) {
    const { inputPaths, outputPath } = body;
    await this.mediaService.concat(inputPaths, outputPath);
    return { ok: true, outputPath };
  }

  /**
   * Download videos from URLs, concat them, upload result to storage, return public URL.
   */
  @Post('concat-and-get-url')
  @HttpCode(HttpStatus.OK)
  async concatAndGetUrl(@Body() body: ConcatAndGetUrlRequestDto) {
    return this.videoAssemblyService.concatAndGetUrl(body.inputUrls);
  }

  /**
   * Download videos from URLs, normalize to 720x1280 and re-encode through a filter
   * graph (avoids stream-parameter drift between generated clips), upload the result.
   */
  @Post('concat-normalized-vertical')
  @HttpCode(HttpStatus.OK)
  async concatNormalizedVertical(
    @Body() body: ConcatNormalizedVerticalRequestDto,
  ) {
    return this.videoAssemblyService.concatNormalizedVerticalAndGetUrl(
      body.inputUrls,
    );
  }
}
