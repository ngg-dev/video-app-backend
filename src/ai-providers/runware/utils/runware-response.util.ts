import { RunwareRunResult } from '../types/runware.types';

function firstString(
  results: RunwareRunResult[],
  field: string,
): string | null {
  const value = results[0]?.[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function extractImageUrl(results: RunwareRunResult[]): string | null {
  return firstString(results, 'imageURL');
}

export function extractVideoUrl(results: RunwareRunResult[]): string | null {
  return firstString(results, 'videoURL');
}

export function extractText(results: RunwareRunResult[]): string | null {
  return firstString(results, 'text');
}

export function extractCost(results: RunwareRunResult[]): number | null {
  const value = results[0]?.cost;
  return typeof value === 'number' ? value : null;
}
