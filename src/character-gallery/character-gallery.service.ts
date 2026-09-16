import { randomUUID } from 'node:crypto';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { StorageService } from 'src/storage/storage.service';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';
import { CreateCharacterDto } from './dto/create-character.dto';
import { CreateCharacterCollectionDto } from './dto/character-collection.dto';
import { buildCharacterTurnaroundPrompt } from './utils/character-image-prompt.util';

@Injectable()
@LogMethods()
export class CharacterGalleryService {
  constructor(
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
    @InjectRepository(CharacterCollectionItemEntity)
    private readonly characterCollectionItemRepository: Repository<CharacterCollectionItemEntity>,
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
  ) {}

  async createCharacter(dto: CreateCharacterDto): Promise<CharacterItemEntity> {
    const { name, prompt, style: dtoStyle, collectionId } = dto;
    const style = await this.resolveCharacterStyle(dtoStyle, collectionId);
    const imagePrompt = buildCharacterTurnaroundPrompt(prompt, style);
    const image = await this.xaiService.generateImage({ prompt: imagePrompt });

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
      name,
      description: prompt,
      style,
      collectionId: collectionId ?? null,
      imageUrl: url,
    });

    return this.characterItemRepository.save(entity);
  }

  private async resolveCharacterStyle(
    style: string | undefined,
    collectionId: string | undefined,
  ): Promise<string | null> {
    if (collectionId) {
      const collection = await this.characterCollectionItemRepository.findOne({
        where: { id: collectionId },
      });

      if (!collection) {
        throw new NotFoundException('Character collection not found.');
      }

      return collection.style;
    }

    return style ?? null;
  }

  async createCharacterCollection(
    dto: CreateCharacterCollectionDto,
  ): Promise<CharacterCollectionItemEntity> {
    const { name, style } = dto;
    const entity = this.characterCollectionItemRepository.create({
      title: name,
      style: style ?? null,
    });

    return this.characterCollectionItemRepository.save(entity);
  }
}
