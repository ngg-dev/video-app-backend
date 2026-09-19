import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  scenario!: string;

  @IsString()
  collectionId!: string;

  @IsOptional()
  @IsEnum(VideoAspectRatio)
  aspectRatio?: VideoAspectRatio;
}

export class CreateVideoResponseDto {
  sceneImageUrl!: string;
  sceneVideoUrl!: string;
}
