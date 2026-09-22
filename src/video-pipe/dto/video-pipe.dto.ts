import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import {
  MAX_SCENE_COUNT,
  MIN_SCENE_COUNT,
} from 'src/shared/constants/scene-count';

export class VideoPipeRequestDto {
  @ArrayMinSize(MIN_SCENE_COUNT)
  @ArrayMaxSize(MAX_SCENE_COUNT)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100_000, { each: true })
  scenarios!: string[];

  @IsString()
  collectionId!: string;

  @IsOptional()
  @IsEnum(VideoAspectRatio)
  aspectRatio?: VideoAspectRatio;
}

export class VideoPipeResponseDto {
  videoUrl!: string;
}
