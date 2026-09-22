import { Body, Controller, Post } from '@nestjs/common';
import { ScenarioPlanService } from './scenario-plan.service';
import {
  GenerateScenarioPlanRequestDto,
  ScenarioPlanResponseDto,
} from './dto/scenario-plan.dto';

@Controller('scenario-plan')
export class ScenarioPlanController {
  constructor(private readonly scenarioPlanService: ScenarioPlanService) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateScenarioPlanRequestDto,
  ): Promise<ScenarioPlanResponseDto> {
    return this.scenarioPlanService.generateScenarioPlan(body);
  }
}
