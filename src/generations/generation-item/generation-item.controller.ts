import { Body, Controller, Post } from '@nestjs/common';
import { GenerationItemService } from './generation-item.service';
import { GenerationItemEntity } from './entities/generation-item.entity';
import { CreateGenerationItemDto } from './dto/create-generation-item.dto';

@Controller('generation-item')
export class GenerationItemController {
  constructor(private readonly generationItemService: GenerationItemService) {}

  @Post('create')
  createItem(
    @Body() dto: CreateGenerationItemDto,
  ): Promise<GenerationItemEntity> {
    return this.generationItemService.create(dto);
  }
}
