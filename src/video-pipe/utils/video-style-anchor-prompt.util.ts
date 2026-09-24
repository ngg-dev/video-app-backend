export const VIDEO_STYLE_ANCHOR_SHEET_NOTE =
  'The reference images are multi-panel character sheets (several angles and facial expressions of one character); the result must be ONE single group frame, not a grid of panels, and must not copy the sheet layout.';

export function buildVideoStyleAnchorPrompt(
  style: string,
  styleDescription: string | null,
): string {
  const descriptionClause = styleDescription ? ` ${styleDescription}` : '';

  return `Group portrait of all the characters shown in the reference images, standing together in a single frame. Visual style: ${style}.${descriptionClause} Keep every character's design, proportions, outfit, and colors faithful to their reference image, rendered in this exact visual style. ${VIDEO_STYLE_ANCHOR_SHEET_NOTE} Plain neutral background, even studio lighting, no text or labels.`;
}
