import { Module } from '@nestjs/common';
import { RunwareImageController } from './controllers/runware-image.controller';
import { RunwareTextController } from './controllers/runware-text.controller';
import { RunwareVideoController } from './controllers/runware-video.controller';
import { RunwareService } from './services/runware.service';

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
