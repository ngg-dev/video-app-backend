import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CHARACTER_APPEARANCE_FIELD_MAX_LENGTH } from '../constants/character-sheet.constant';
import type { CharacterAppearance } from '../types/character-appearance.types';

export class CharacterAppearanceDto implements CharacterAppearance {
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  ageAndGender!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  face!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  hair!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  build!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  outfit!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  footwear!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  accessories!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH)
  palette!: string;
}
