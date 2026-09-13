import { randomUUID } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { StorageService } from 'src/storage/storage.service';
import { CharacterItemEntity } from './entities/character-item.entity';
import { CreateCharacterDto } from './dto/create-character.dto';

@Injectable()
@LogMethods()
export class CharacterGalleryService {
  constructor(
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
  ) {}

  async createCharacter(dto: CreateCharacterDto): Promise<CharacterItemEntity> {
    const image = await this.xaiService.generateImage({ prompt: dto.prompt });

    if (!image) {
      throw new InternalServerErrorException(
        'Character image generation failed.',
      );
    }

    const extension = image.mediaType?.split('/')[1] ?? 'png';
    const key = `characters/${Date.now()}-${randomUUID()}.${extension}`;
    const { url } = await this.storageService.upload(
      key,
      Buffer.from(image.uint8Array),
      image.mediaType,
    );

    const entity = this.characterItemRepository.create({
      name: dto.name,
      description: dto.prompt,
      style: dto.style ?? null,
      imageUrls: [url],
    });

    return this.characterItemRepository.save(entity);
  }
}
