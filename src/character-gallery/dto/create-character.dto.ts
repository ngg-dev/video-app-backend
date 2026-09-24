import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CharacterAppearanceDto } from './character-appearance.dto';

export class CreateCharacterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CharacterAppearanceDto)
  appearance!: CharacterAppearanceDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  style?: string;

  @IsOptional()
  @IsString()
  collectionId?: string;
}
