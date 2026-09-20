import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Download binary from URL and write to file path. Creates parent dirs if needed.
 * Reusable for any "download and save" flow.
 */
export async function downloadBinaryToPath(
  url: string,
  filePath: string,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
}
