import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { CharacterItemEntity } from './entities/character-item.entity';
import { CreateCharacterDto } from './dto/create-character.dto';

@Injectable()
@LogMethods()
export class CharacterGalleryService {
  constructor(
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
    private readonly xaiService: XaiService,
  ) {}

  async createCharacter(dto: CreateCharacterDto): Promise<CharacterItemEntity> {
    const image = await this.xaiService.generateImage({ prompt: dto.prompt });

    if (!image) {
      throw new InternalServerErrorException(
        'Character image generation failed.',
      );
    }

    const entity = this.characterItemRepository.create({
      name: dto.name,
      description: dto.prompt,
      style: dto.style ?? null,
      imageUrls: [`data:${image.mediaType};base64,${image.base64}`],
    });

    return this.characterItemRepository.save(entity);
  }
}
