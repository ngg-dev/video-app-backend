import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class GenerateImageRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  prompt!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];

  @IsOptional()
  @Matches(/^\d+:\d+$/)
  aspectRatio?: `${number}:${number}`;
}

export class GenerateImageResponseDto {
  @IsString()
  @IsNotEmpty()
  base64!: string;

  @IsString()
  @IsNotEmpty()
  mediaType!: string;
}
