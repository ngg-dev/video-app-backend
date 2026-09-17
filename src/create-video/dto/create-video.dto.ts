import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  scenario!: string;

  @IsString()
  collectionId!: string;
}

export class CreateVideoResponseDto {
  sceneImageUrl!: string;
  sceneVideoUrl!: string;
}
