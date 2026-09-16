export function buildCharacterTurnaroundPrompt(
  prompt: string,
  style: string | null,
): string {
  const styleClause = style ? ` Art style: ${style}.` : '';

  return `${prompt}.${styleClause} Character turnaround sheet on a single plain neutral background: the same character shown in three views side by side — front view, side (profile) view, and back view. Consistent character design, proportions, outfit, and colors across all three views. Full body, standing neutral pose, even studio lighting, no shadows between views, no text or labels.`;
}
