export function buildVideoStyleAnchorPrompt(
  style: string,
  styleDescription: string | null,
): string {
  const descriptionClause = styleDescription ? ` ${styleDescription}` : '';

  return `Group portrait of all the characters shown in the reference images, standing together in a single frame. Visual style: ${style}.${descriptionClause} Keep every character's design, proportions, outfit, and colors faithful to their reference image, rendered in this exact visual style. Plain neutral background, even studio lighting, no text or labels.`;
}
