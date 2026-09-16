import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CharacterStyle } from 'src/shared/constants/character-style';

export class CreateCharacterCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsEnum(CharacterStyle)
  style?: CharacterStyle;
}
