import { DataContent, GeneratedFile } from 'ai';

export type AspectRatio = `${number}:${number}`;

export type XaiImageResolution = '1k' | '2k';

export interface GenerateParams {
  model?: string;
  prompt: string;
}

export interface GenerateImageParams {
  model?: string;
  prompt: string;
  referenceImages?: DataContent[];
  aspectRatio?: AspectRatio;
  resolution?: XaiImageResolution;
}

export interface GenerateVideoParams {
  model?: string;
  prompt: string;
  referenceImageUrls: string[];
  resolution?: '480p' | '720p' | '1080p';
  /** Duration of the generated video, in seconds. */
  duration?: number;
}

export interface XaiGeneratedVideo {
  video: GeneratedFile;
  videoUrl: string | null;
}
