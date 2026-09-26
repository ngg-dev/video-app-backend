import { Module } from '@nestjs/common';
import { DeepSeekService } from './services/deepseek.service';
import { DeepSeekController } from './controllers/deepseek.controller';

@Module({
  controllers: [DeepSeekController],
  providers: [DeepSeekService],
  exports: [DeepSeekService],
})
export class DeepSeekModule {}
