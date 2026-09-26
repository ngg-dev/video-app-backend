/**
 * Single normalization rule for scenario text, so cache keys and matching stay consistent
 * wherever a scenario is compared or hashed (create-video service, cache service).
 */
export function normalizeScenario(scenario: string): string {
  return scenario.toLowerCase();
}

const CAMERA_LINE_PATTERN = /^\s*[-*•]?\s*камера\s*:/i;

/**
 * Removes lines with camera directions ("Камера: ...") from the scenario text.
 * Video is generated with a static camera, so old scenarios that still carry
 * such hints must not pass them on to the video prompt.
 */
export function stripCameraDirections(scenario: string): string {
  return scenario
    .split('\n')
    .filter((line) => !CAMERA_LINE_PATTERN.test(line))
    .join('\n')
    .trim();
}
