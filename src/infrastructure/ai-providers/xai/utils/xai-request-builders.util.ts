import type {
  GenerateImageParams,
  GenerateVideoParams,
} from '../types/xai.types';

export function buildGenerateImageOptions({
  prompt,
  referenceImages,
  aspectRatio,
  resolution,
}: GenerateImageParams) {
  const hasReferenceImages = !!referenceImages?.length;

  return {
    prompt: hasReferenceImages
      ? { text: prompt, images: referenceImages }
      : prompt,
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(resolution ? { providerOptions: { xai: { resolution } } } : {}),
  };
}

export function buildGenerateVideoOptions({
  prompt,
  referenceImageUrls,
  resolution,
  duration,
}: GenerateVideoParams) {
  return {
    prompt,
    ...(duration ? { duration } : {}),
    providerOptions: {
      xai: {
        mode: 'reference-to-video' as const,
        referenceImageUrls,
        ...(resolution ? { resolution } : {}),
      },
    },
  };
}
