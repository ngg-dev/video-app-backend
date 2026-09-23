import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';
import { CreateCharacterDto } from './dto/create-character.dto';
import { CreateCharacterCollectionDto } from './dto/character-collection.dto';
import { CharacterImageService } from './character-image.service';

@Injectable()
@LogMethods()
export class CharacterGalleryService {
  constructor(
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
    @InjectRepository(CharacterCollectionItemEntity)
    private readonly characterCollectionItemRepository: Repository<CharacterCollectionItemEntity>,
    private readonly characterImageService: CharacterImageService,
  ) {}

  async createCharacter(dto: CreateCharacterDto): Promise<CharacterItemEntity> {
    const { name, prompt, style: dtoStyle, collectionId } = dto;
    const style = await this.resolveCharacterStyle(dtoStyle, collectionId);
    const imageUrl = await this.characterImageService.generateCharacterImage(
      prompt,
      style,
    );

    const entity = this.characterItemRepository.create({
      name,
      description: prompt,
      style,
      collectionId: collectionId ?? null,
      imageUrl,
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
    const { name, style, styleDescription } = dto;
    const entity = this.characterCollectionItemRepository.create({
      title: name,
      style: style ?? null,
      styleDescription: styleDescription ?? null,
      styleAnchorImageUrl: null,
    });

    return this.characterCollectionItemRepository.save(entity);
  }
}
