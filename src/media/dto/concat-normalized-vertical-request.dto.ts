import { IsArray, IsUrl, ArrayMinSize } from 'class-validator';

/** Request body for POST /media/concat-normalized-vertical */
export class ConcatNormalizedVerticalRequestDto {
  /** Direct video URLs to download, normalize to 720x1280, concat and upload to storage */
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  inputUrls!: string[];
}
