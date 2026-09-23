import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CharacterStyle } from 'src/shared/constants/character-style';
import { COLLECTION_STYLE_DESCRIPTION_MAX_LENGTH } from '../constants/character-gallery.constant';

export class CreateCharacterCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsEnum(CharacterStyle)
  style?: CharacterStyle;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COLLECTION_STYLE_DESCRIPTION_MAX_LENGTH)
  styleDescription?: string;
}
