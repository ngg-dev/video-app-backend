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
  MAX_VIDEO_DURATION_SECONDS,
  MIN_VIDEO_DURATION_SECONDS,
} from 'src/shared/constants/video-duration';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';

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

  /** Video duration in seconds. Defaults to DEFAULT_VIDEO_DURATION_SECONDS. */
  @IsOptional()
  @IsInt()
  @Min(MIN_VIDEO_DURATION_SECONDS)
  @Max(MAX_VIDEO_DURATION_SECONDS)
  duration?: number;

  /**
   * Preloaded collection/characters, set only by internal callers (e.g.
   * VideoPipeService) that already fetched this data — lets
   * CreateVideoService skip its own repository lookups. Never populated
   * from an HTTP request body: intentionally undecorated so class-validator
   * ignores it, and CreateVideoController never sets it. The caller must
   * also have already resolved `collection.styleAnchorImageUrl`.
   */
  collection?: CharacterCollectionItemEntity | null;
  characters?: CharacterItemEntity[];

  /**
   * Style reference image URL, set only by internal callers (e.g.
   * VideoPipeService) with the previous scene's image URL to keep the
   * visual style consistent across scenes. Never populated from an HTTP
   * request body: intentionally undecorated so class-validator ignores it,
   * and CreateVideoController never sets it.
   */
  styleReferenceImageUrl?: string;
}

export class CreateVideoResponseDto {
  sceneImageUrl!: string;
  sceneVideoUrl!: string;
}
