import { Module } from '@nestjs/common';
import { CreateVideoController } from './create-video.controller';
import { CreateVideoService } from './create-video.service';
import { DeepSeekModule } from 'src/ai-providers/deepseek/deepseek.module';

@Module({
  imports: [DeepSeekModule],
  controllers: [CreateVideoController],
  providers: [CreateVideoService],
})
export class CreateVideoModule {}
