export const MEDIA_CONCAT_KEY_PREFIX = 'videos/concat';

/** Encoding parameters used when re-encoding through the normalizing concat filter-graph. */
export const NORMALIZED_CONCAT_ENCODING = {
  videoCodec: 'libx264',
  preset: 'veryfast',
  crf: '20',
  audioCodec: 'aac',
  audioBitrate: '192k',
  fps: 24,
  pixelFormat: 'yuv420p',
  movflags: '+faststart',
} as const;

export const MEDIA_VIDEO_CONTENT_TYPE = 'video/mp4';

/** Names of temporary artifacts created while assembling a video from remote parts. */
export const MEDIA_TEMP_ARTIFACT_NAMES = {
  tempDirPrefix: 'concat',
  partFileName: (index: number) => `part-${index}.mp4`,
  resultFileName: 'result.mp4',
  concatListFileName: (timestamp: number) => `ffmpeg-concat-${timestamp}.txt`,
} as const;
