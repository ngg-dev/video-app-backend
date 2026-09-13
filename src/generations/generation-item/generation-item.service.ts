import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GenerationItemEntity } from './entities/generation-item.entity';
import { Repository } from 'typeorm';
import { CreateGenerationItemDto } from './dto/create-generation-item.dto';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';

@LogMethods()
@Injectable()
export class GenerationItemService {
  constructor(
    @InjectRepository(GenerationItemEntity)
    private readonly generationItemRepository: Repository<GenerationItemEntity>,
  ) {}

  async create(dto: CreateGenerationItemDto): Promise<GenerationItemEntity> {
    const entity = this.generationItemRepository.create(dto);
    return this.generationItemRepository.save(entity);
  }
}
