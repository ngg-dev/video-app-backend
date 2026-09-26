import { Module } from '@nestjs/common';
import { RunwareImageController } from './runware-image.controller';
import { RunwareTextController } from './runware-text.controller';
import { RunwareVideoController } from './runware-video.controller';
import { RunwareService } from './runware.service';

@Module({
  controllers: [
    RunwareTextController,
    RunwareImageController,
    RunwareVideoController,
  ],
  providers: [RunwareService],
  exports: [RunwareService],
})
export class RunwareModule {}
