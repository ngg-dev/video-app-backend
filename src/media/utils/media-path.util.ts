/**
 * Path escaping for ffmpeg. Isolated so MediaService stays focused on operations (SRP).
 */

/** Escape backslashes, shared by the ffmpeg path-escaping helpers below. */
function escapeBackslashes(p: string): string {
  return p.replace(/\\/g, '\\\\');
}

/** Escape path for concat demuxer list file (single quotes). */
export function escapePathForConcat(p: string): string {
  return `'${escapeBackslashes(p).replace(/'/g, "'\\''")}'`;
}

/** Escape path for ffmpeg filter (e.g. subtitles= path): backslash and colon. */
export function escapePathForFilter(p: string): string {
  return escapeBackslashes(p).replace(/:/g, '\\:').replace(/'/g, "'\\''");
}

/** Crop box for aspect ratio (e.g. "9:16"). Returns even dimensions for ffmpeg. */
export function computeCropForAspectRatio(
  width: number,
  height: number,
  aspectRatio: string,
): { cropW: number; cropH: number; cropX: number; cropY: number } {
  const [targetW, targetH] = aspectRatio.split(':').map(Number);
  if (!targetW || !targetH) {
    throw new Error(`Invalid aspect ratio: ${aspectRatio}`);
  }
  const outW = Math.min(width, Math.floor((height * targetW) / targetH));
  const outH = Math.min(height, Math.floor((width * targetH) / targetW));
  const cropW = (outW >> 1) << 1;
  const cropH = (outH >> 1) << 1;
  const cropX = (width - cropW) >> 1;
  const cropY = (height - cropH) >> 1;
  return { cropW, cropH, cropX, cropY };
}
