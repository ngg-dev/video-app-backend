import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

export interface GenerateTextParams {
  model?: string;
  prompt: string;
}

export interface GenerateImageParams {
  model?: string;
  prompt: string;
  referenceImages?: string[];
  width?: number;
  height?: number;
}

export interface GenerateVideoParams {
  model?: string;
  prompt: string;
  referenceImageUrls?: string[];
  aspectRatio?: VideoAspectRatio;
  /** seconds */
  duration?: number;
}

export type RunwareRunResult = Record<string, unknown>;

/**
 * Минимальный контракт клиента SDK. Типы `@runware/sdk` под nodenext не
 * резолвятся (ESM-пакет с экстенсионless-импортами в .d.ts), поэтому описываем
 * только используемую часть сами.
 */
export interface RunwareClient {
  run(params: object): Promise<RunwareRunResult[]>;
}

export interface RunwareSdkModule {
  createClient(options: {
    apiKey: string;
    transport: 'rest';
  }): Promise<RunwareClient>;
}
