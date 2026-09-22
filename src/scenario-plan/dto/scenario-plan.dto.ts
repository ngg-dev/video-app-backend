import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import {
  MAX_SCENE_COUNT,
  MIN_SCENE_COUNT,
} from 'src/shared/constants/scene-count';
import { MAX_IDEA_LENGTH } from '../constants/scenario-plan.constant';

export class GenerateScenarioPlanRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_IDEA_LENGTH)
  idea!: string;

  @IsString()
  @IsNotEmpty()
  collectionId!: string;

  @IsInt()
  @Min(MIN_SCENE_COUNT)
  @Max(MAX_SCENE_COUNT)
  sceneCount!: number;

  @IsOptional()
  @IsEnum(VideoAspectRatio)
  aspectRatio?: VideoAspectRatio;
}

export class GeneratedSceneDto {
  speakers!: string[];
  text!: string;
}

export class ScenarioPlanResponseDto {
  scenarios!: string[];
  collectionId!: string;
  aspectRatio?: VideoAspectRatio;
  scenes!: GeneratedSceneDto[];
}
