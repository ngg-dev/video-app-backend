/** Derive a file extension from a MIME media type (e.g. `image/webp` → `webp`), with a fallback. */
export function extensionFromMediaType(
  mediaType?: string,
  fallback = 'png',
): string {
  return mediaType?.split('/')[1] ?? fallback;
}
