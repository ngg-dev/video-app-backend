import { Module } from '@nestjs/common';
import { XaiTextController } from './xai-text.controller';
import { XaiImageController } from './xai-image.controller';
import { XaiService } from './xai.service';

@Module({
  controllers: [XaiTextController, XaiImageController],
  providers: [XaiService],
  exports: [XaiService],
})
export class XaiModule {}
