import { IsString, IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';

/** Request body for POST /media/concat */
export class ConcatRequestDto {
  /** Paths to video files in concatenation order */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  inputPaths!: string[];

  /** Output file path */
  @IsString()
  @IsNotEmpty()
  outputPath!: string;
}
