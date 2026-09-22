/**
 * Single normalization rule for scenario text, so cache keys and matching stay consistent
 * wherever a scenario is compared or hashed (create-video service, cache service).
 */
export function normalizeScenario(scenario: string): string {
  return scenario.toLowerCase();
}
