import { Module } from '@nestjs/common';
import { XaiTextController } from './controllers/xai-text.controller';
import { XaiImageController } from './controllers/xai-image.controller';
import { XaiService } from './services/xai.service';

@Module({
  controllers: [XaiTextController, XaiImageController],
  providers: [XaiService],
  exports: [XaiService],
})
export class XaiModule {}
