import { Body, Controller, Post } from '@nestjs/common';
import { CharacterGalleryService } from './character-gallery.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { CharacterItemEntity } from './entities/character-item.entity';

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
}
