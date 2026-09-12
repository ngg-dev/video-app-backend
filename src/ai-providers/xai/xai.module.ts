import { Module } from '@nestjs/common';
import { XaiController } from './xai.controller';
import { XaiService } from './xai.service';

@Module({
  controllers: [XaiController],
  providers: [XaiService],
})
export class XaiModule {}
