import { Body, Controller, Post } from '@nestjs/common';
import { CharacterGalleryService } from './character-gallery.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { CreateCharacterCollectionDto } from './dto/character-collection.dto';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';

@Controller('character-gallery')
export class CharacterGalleryController {
  constructor(
    private readonly characterGalleryService: CharacterGalleryService,
  ) {}

  @Post('create')
  createCharacter(
    @Body() dto: CreateCharacterDto,
  ): Promise<CharacterItemEntity> {
    return this.characterGalleryService.createCharacter(dto);
  }

  @Post('collection/create')
  createCharacterCollection(
    @Body() dto: CreateCharacterCollectionDto,
  ): Promise<CharacterCollectionItemEntity> {
    return this.characterGalleryService.createCharacterCollection(dto);
  }
}
