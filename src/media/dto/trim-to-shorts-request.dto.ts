import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  Min,
} from 'class-validator';

/** Request body for POST /media/trim-to-shorts */
export class TrimToShortsRequestDto {
  @IsString()
  @IsNotEmpty()
  inputPath!: string;

  @IsString()
  @IsNotEmpty()
  outputPath!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  startSec?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  endSec?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSec?: number;
}
