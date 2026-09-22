/**
 * Pure ffmpeg argument/filter-graph builders. Isolated so MediaService stays focused on
 * orchestrating ffmpeg calls (SRP) — none of these touch the filesystem, network or `this`.
 */
import { escapePathForConcat } from 'src/media/utils/media-path.util';
import { NORMALIZED_CONCAT_ENCODING } from 'src/media/constants/media.constant';
import { isNotNullOrUndefined } from 'src/shared/utils';
import type {
  CropFormatOptions,
  TrimTimeOptions,
} from 'src/media/types/media.types';

export interface MediaSize {
  width: number;
  height: number;
}

/** Crop box in pixels, already resolved (e.g. via `computeCropForAspectRatio`). */
export interface CropBox {
  cropW: number;
  cropH: number;
  cropX: number;
  cropY: number;
}

/**
 * Build the `-filter_complex` graph that scales/pads every input to `size`, then concatenates
 * them. Video is normalized to the configured fps/pixel format, audio is resampled.
 */
export function buildNormalizedConcatFilterGraph(
  inputCount: number,
  size: MediaSize,
): string {
  const { fps, pixelFormat } = NORMALIZED_CONCAT_ENCODING;
  const filterParts: string[] = [];
  const concatInputs: string[] = [];

  for (let i = 0; i < inputCount; i++) {
    filterParts.push(
      `[${i}:v:0]scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=${pixelFormat}[v${i}]`,
      `[${i}:a:0]aresample=async=1:first_pts=0[a${i}]`,
    );
    concatInputs.push(`[v${i}][a${i}]`);
  }
  filterParts.push(
    `${concatInputs.join('')}concat=n=${inputCount}:v=1:a=1[v][a]`,
  );

  return filterParts.join(';');
}

/** Build the full ffmpeg argument list for the normalizing concat (filter-graph + encoding). */
export function buildNormalizedConcatArgs(
  inputPaths: string[],
  outputPath: string,
  size: MediaSize,
): string[] {
  const { videoCodec, preset, crf, audioCodec, audioBitrate, movflags } =
    NORMALIZED_CONCAT_ENCODING;
  const args: string[] = ['-y'];
  for (const p of inputPaths) {
    args.push('-i', p);
  }

  return [
    ...args,
    '-filter_complex',
    buildNormalizedConcatFilterGraph(inputPaths.length, size),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    videoCodec,
    '-preset',
    preset,
    '-crf',
    crf,
    '-c:a',
    audioCodec,
    '-b:a',
    audioBitrate,
    '-movflags',
    movflags,
    outputPath,
  ];
}

/** Build the content of a concat demuxer list file from input paths. */
export function buildConcatListContent(paths: string[]): string {
  return paths.map((p) => `file ${escapePathForConcat(p)}`).join('\n');
}

/**
 * Build the `trim` ffmpeg argument list. Codec selection is explicit: any video filter forces
 * re-encode (`-c:v libx264 -c:a aac`), otherwise the stream is copied (`-c copy`).
 */
export function buildTrimArgs(
  inputPath: string,
  outputPath: string,
  options: TrimTimeOptions & { crop?: CropFormatOptions; cropBox?: CropBox },
): string[] {
  const { startSec, endSec, durationSec, crop, cropBox } = options;
  const args: string[] = ['-y', '-i', inputPath];

  // -ss before -i for fast seek (input seeking)
  args.push('-ss', String(startSec));
  if (isNotNullOrUndefined(endSec)) {
    args.push('-to', String(endSec));
  } else if (isNotNullOrUndefined(durationSec)) {
    args.push('-t', String(durationSec));
  }

  const videoFilter = buildCropVideoFilter(crop, cropBox);
  if (isNotNullOrUndefined(videoFilter)) {
    args.push('-vf', videoFilter);
    args.push('-c:v', 'libx264', '-c:a', 'aac');
  } else {
    args.push('-c', 'copy');
  }

  args.push(outputPath);
  return args;
}

function buildCropVideoFilter(
  crop: CropFormatOptions | undefined,
  cropBox: CropBox | undefined,
): string | undefined {
  if (crop?.aspectRatio) {
    if (!cropBox) {
      throw new Error('cropBox is required to crop by aspect ratio.');
    }
    return `crop=${cropBox.cropW}:${cropBox.cropH}:${cropBox.cropX}:${cropBox.cropY}`;
  }

  if (isNotNullOrUndefined(crop?.width) && isNotNullOrUndefined(crop?.height)) {
    return `scale=${crop.width}:${crop.height}:force_original_aspect_ratio=increase,crop=${crop.width}:${crop.height}`;
  }

  return undefined;
}
