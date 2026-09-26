import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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
  @IsInt()
  @Min(256)
  @Max(2048)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(256)
  @Max(2048)
  height?: number;
}

export class GenerateImageResponseDto {
  @IsString()
  @IsNotEmpty()
  imageUrl!: string;
}
