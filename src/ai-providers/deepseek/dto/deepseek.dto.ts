import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  prompt!: string;
}

export class GenerateResponsetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  message!: string;
}
