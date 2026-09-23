import { isNotUndefined } from 'src/shared/utils';

/**
 * Builds the ordered list of reference images passed to image generation:
 * character reference images first, then — when a style reference is
 * provided — the style reference image last.
 */
export function buildSceneReferenceImages(
  characterReferenceImages: string[],
  styleReferenceImageUrl?: string,
): string[] {
  return isNotUndefined(styleReferenceImageUrl)
    ? [...characterReferenceImages, styleReferenceImageUrl]
    : [...characterReferenceImages];
}
