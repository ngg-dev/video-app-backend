export enum VideoAspectRatio {
  Vertical = '9:16',
  Horizontal = '16:9',
  Square = '1:1',
}

export const DEFAULT_VIDEO_ASPECT_RATIO = VideoAspectRatio.Vertical;

export const VIDEO_ASPECT_RATIO_DIMENSIONS: Record<
  VideoAspectRatio,
  { width: number; height: number }
> = {
  [VideoAspectRatio.Vertical]: { width: 720, height: 1280 },
  [VideoAspectRatio.Horizontal]: { width: 1280, height: 720 },
  [VideoAspectRatio.Square]: { width: 720, height: 720 },
};
