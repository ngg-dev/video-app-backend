import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import {
  MAX_VIDEO_DURATION_SECONDS,
  MIN_VIDEO_DURATION_SECONDS,
} from 'src/shared/constants/video-duration';

export class GenerateVideoRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  prompt!: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  referenceImageUrls?: string[];

  @IsOptional()
  @IsEnum(VideoAspectRatio)
  aspectRatio?: VideoAspectRatio;

  @IsOptional()
  @IsInt()
  @Min(MIN_VIDEO_DURATION_SECONDS)
  @Max(MAX_VIDEO_DURATION_SECONDS)
  duration?: number;
}

export class GenerateVideoResponseDto {
  @IsString()
  @IsNotEmpty()
  videoUrl!: string;
}
