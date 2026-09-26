import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateTextRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  prompt!: string;
}

export class GenerateTextResponseDto {
  @IsString()
  @MaxLength(100_000)
  message!: string;
}
