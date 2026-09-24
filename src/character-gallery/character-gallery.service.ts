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
import type { CharacterSheetStyle } from './types/character-appearance.types';

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
    const { name, appearance, style: dtoStyle, collectionId } = dto;
    const resolved = await this.resolveCharacterStyle(dtoStyle, collectionId);
    const imageUrl = await this.characterImageService.generateCharacterSheet(
      appearance,
      resolved,
    );

    const entity = this.characterItemRepository.create({
      name,
      appearance,
      style: resolved.style,
      collectionId: collectionId ?? null,
      imageUrl,
    });

    return this.characterItemRepository.save(entity);
  }

  private async resolveCharacterStyle(
    style: string | undefined,
    collectionId: string | undefined,
  ): Promise<CharacterSheetStyle> {
    if (collectionId) {
      const collection = await this.characterCollectionItemRepository.findOne({
        where: { id: collectionId },
      });

      if (!collection) {
        throw new NotFoundException('Character collection not found.');
      }

      return {
        style: collection.style,
        styleDescription: collection.styleDescription,
      };
    }

    return { style: style ?? null, styleDescription: null };
  }

  async createCharacterCollection(
    dto: CreateCharacterCollectionDto,
  ): Promise<CharacterCollectionItemEntity> {
    const { name, style, styleDescription } = dto;
    const entity = this.characterCollectionItemRepository.create({
      title: name,
      style: style ?? null,
      styleDescription: styleDescription ?? null,
    });

    return this.characterCollectionItemRepository.save(entity);
  }
}
