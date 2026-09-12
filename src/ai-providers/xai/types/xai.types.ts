import { DataContent } from 'ai';

export type AspectRatio = `${number}:${number}`;

export interface GenerateParams {
  model?: string;
  prompt: string;
}

export interface GenerateImageParams {
  model?: string;
  prompt: string;
  referenceImages?: DataContent[];
  aspectRatio?: AspectRatio;
}
