import { Module } from '@nestjs/common';
import { DeepSeekModule } from 'src/ai-providers/deepseek/deepseek.module';
import { CharacterGalleryModule } from 'src/character-gallery/character-gallery.module';
import { ScenarioPlanController } from './scenario-plan.controller';
import { ScenarioPlanService } from './scenario-plan.service';
import { ScenarioPlanPromptService } from './scenario-plan-prompt.service';

@Module({
  imports: [DeepSeekModule, CharacterGalleryModule],
  controllers: [ScenarioPlanController],
  providers: [ScenarioPlanService, ScenarioPlanPromptService],
})
export class ScenarioPlanModule {}
