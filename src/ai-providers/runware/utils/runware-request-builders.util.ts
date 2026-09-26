import { RUNWARE_DEFAULT_IMAGE_SIZE } from 'src/shared/constants/runware';
import {
  DEFAULT_VIDEO_ASPECT_RATIO,
  VIDEO_ASPECT_RATIO_DIMENSIONS,
} from 'src/shared/constants/video-aspect-ratio';
import { DEFAULT_VIDEO_DURATION_SECONDS } from 'src/shared/constants/video-duration';
import {
  GenerateImageParams,
  GenerateTextParams,
  GenerateVideoParams,
} from '../types/runware.types';

export function buildTextInferenceParams({
  model,
  prompt,
}: GenerateTextParams & { model: string }) {
  return {
    model,
    messages: [{ role: 'user' as const, content: prompt }],
    includeCost: true,
    includeUsage: true,
  };
}

export function buildImageInferenceParams({
  model,
  prompt,
  referenceImages,
  width,
  height,
}: GenerateImageParams & { model: string }) {
  return {
    model,
    positivePrompt: prompt,
    width: width ?? RUNWARE_DEFAULT_IMAGE_SIZE.width,
    height: height ?? RUNWARE_DEFAULT_IMAGE_SIZE.height,
    outputType: 'URL' as const,
    includeCost: true,
    ...(referenceImages && referenceImages.length > 0
      ? { inputs: { referenceImages } }
      : {}),
  };
}

export function buildVideoInferenceParams({
  model,
  prompt,
  referenceImageUrls,
  aspectRatio,
  duration,
}: GenerateVideoParams & { model: string }) {
  const { width, height } =
    VIDEO_ASPECT_RATIO_DIMENSIONS[aspectRatio ?? DEFAULT_VIDEO_ASPECT_RATIO];
  return {
    model,
    positivePrompt: prompt,
    width,
    height,
    duration: duration ?? DEFAULT_VIDEO_DURATION_SECONDS,
    outputType: 'URL' as const,
    includeCost: true,
    ...(referenceImageUrls && referenceImageUrls.length > 0
      ? { inputs: { referenceImages: referenceImageUrls } }
      : {}),
  };
}
