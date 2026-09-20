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
import { VIDEO_PIPE_SCENE_COUNT } from '../constants/video-pipe.constant';
import { CreateVideoResponseDto } from 'src/create-video/dto/create-video.dto';

export class VideoPipeRequestDto {
  @ArrayMinSize(VIDEO_PIPE_SCENE_COUNT)
  @ArrayMaxSize(VIDEO_PIPE_SCENE_COUNT)
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

export type VideoPipeResponseDto = CreateVideoResponseDto[];
