/** Trim by time: start (seconds) and end (seconds) or duration (seconds) */
export interface TrimTimeOptions {
  startSec: number;
  endSec?: number;
  durationSec?: number;
}

/** Crop to aspect ratio (e.g. "16:9", "9:16") or to exact width x height */
export interface CropFormatOptions {
  /** Aspect ratio "width:height", e.g. "16:9", "9:16" */
  aspectRatio?: string;
  /** Or exact size "width:height" */
  width?: number;
  height?: number;
}

export interface TrimOptions extends TrimTimeOptions {
  /** Optional crop to format after trim */
  crop?: CropFormatOptions;
}

export interface MergeAudioOptions {
  videoPath: string;
  audioPath: string;
}

export interface BurnSubtitlesOptions {
  videoPath: string;
  /** Path to .srt or .ass file */
  subtitlesPath: string;
  /** Optional: escape special chars in path for ffmpeg filter (default true) */
  escapePath?: boolean;
}

/** Optional time range for YouTube Shorts (vertical 9:16). Max 60s for Shorts. */
export interface TrimToShortsOptions {
  startSec?: number;
  endSec?: number;
  durationSec?: number;
}
