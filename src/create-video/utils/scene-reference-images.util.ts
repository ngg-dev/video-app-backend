import { isNotUndefined } from 'src/shared/utils';

export interface SceneReferenceImagesParams {
  characterReferenceImages: string[];
  styleAnchorImageUrl?: string;
  previousSceneImageUrl?: string;
}

/**
 * Builds the ordered list of reference images passed to image generation:
 * character reference images first, then the collection style anchor (when
 * present), then the previous scene image (when present).
 */
export function buildSceneReferenceImages({
  characterReferenceImages,
  styleAnchorImageUrl,
  previousSceneImageUrl,
}: SceneReferenceImagesParams): string[] {
  const referenceImages = [...characterReferenceImages];

  if (isNotUndefined(styleAnchorImageUrl)) {
    referenceImages.push(styleAnchorImageUrl);
  }

  if (isNotUndefined(previousSceneImageUrl)) {
    referenceImages.push(previousSceneImageUrl);
  }

  return referenceImages;
}

/** Drops empty reference images so they neither reach xAI nor occupy a position. */
export function selectCharacterReferenceImages(
  referenceImages: string[],
): string[] {
  return referenceImages.filter((imageUrl) => imageUrl !== '');
}
