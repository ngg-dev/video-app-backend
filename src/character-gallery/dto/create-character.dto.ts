import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  style?: string;

  @IsOptional()
  @IsString()
  collectionId?: string;
}
