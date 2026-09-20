import { IsArray, IsUrl, ArrayMinSize } from 'class-validator';

/** Request body for POST /media/concat-and-get-url */
export class ConcatAndGetUrlRequestDto {
  /** Direct video URLs to download, concat and upload to storage */
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  inputUrls!: string[];
}
