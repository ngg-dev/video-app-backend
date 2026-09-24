import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

export const SCENE_IMAGE_PROMPT_INSTRUCTIONS = [
  'You are a prompt engineer writing a prompt for Grok Imagine (xAI text-to-image model).',
  'Grok Imagine follows natural language, not comma-separated keyword stacks, so write flowing sentences, not tag lists.',
  'Rewrite the scene description below into one vivid, highly specific paragraph, covering, in this order:',
  '1) Subject — who/what is in the scene and what they are doing.',
  '2) Environment — the setting, background, and time of day.',
  '3) Lighting — light source and direction (e.g. soft morning backlight, harsh neon glow).',
  '4) Camera — shot type, angle, and lens feel (e.g. low-angle wide shot, 35mm close-up).',
  '5) Style and mood — art style, color palette, atmosphere.',
  'Stay faithful to the original scenario: do not invent new characters, locations, or plot points not implied by it.',
  'Respond with the prompt paragraph only, no headings, no explanations, no quotes.',
];

export const SCENE_VIDEO_PROMPT_INSTRUCTIONS = [
  'You are a prompt engineer writing a motion prompt for Grok Imagine (xAI reference-to-video model) that will animate an already-generated still image.',
  'The still image is passed to the model as a reference image and must be referred to in the prompt using the literal tag <IMAGE_1> (e.g. "the character from <IMAGE_1> turns and walks forward"). Include <IMAGE_1> at least once.',
  'Grok Imagine follows natural language, not comma-separated keyword stacks, so write flowing sentences, not tag lists.',
  'Rewrite the scene description below into one vivid paragraph describing only the movement, action, and camera motion that should happen as <IMAGE_1> comes to life.',
  'Do not change or re-describe the characters appearance, the art style, or the composition of the scene — <IMAGE_1> already defines those.',
  'Do not invent new characters or locations that are not already implied by the scene.',
  'Respond with the prompt paragraph only, no headings, no explanations, no quotes.',
];

export function buildSceneImageCharactersHint(
  characterNames: string[],
): string {
  return characterNames.length
    ? `Characters present in the scene (keep their appearance consistent with the reference images): ${characterNames.join(', ')}.`
    : '';
}

export function buildSceneVideoCharactersHint(
  characterNames: string[],
): string {
  return characterNames.length
    ? `Characters present in the scene (keep their appearance unchanged): ${characterNames.join(', ')}.`
    : '';
}

export function buildSceneStyleHint(
  collectionStyle: string | null,
  styleDescription?: string | null,
): string {
  if (!collectionStyle) {
    return '';
  }

  const descriptionClause = styleDescription ? ` ${styleDescription}` : '';

  return `Render the image in the following visual style: ${collectionStyle}.${descriptionClause}`;
}

export function buildSceneStyleTag(
  collectionStyle: string | null,
  styleDescription?: string | null,
): string {
  if (!collectionStyle) {
    return '';
  }

  const descriptionClause = styleDescription ? ` ${styleDescription}` : '';

  return `Visual style: ${collectionStyle}.${descriptionClause} Keep this exact visual style.`;
}

export function buildSceneCharacterReferenceLine(
  position: number,
  name?: string,
): string {
  return `Image ${position}: ${name || 'character'} — keep face, hair, body, outfit exactly.`;
}

export function buildSceneLocationReferenceLine(position: number): string {
  return `Image ${position}: location — reproduce environment and architecture.`;
}

export function buildSceneStyleAnchorReferenceLine(position: number): string {
  return `Image ${position}: style anchor — use only color palette, rendering technique, line and shading; do not copy its composition, background, characters or story.`;
}

export function buildScenePreviousSceneReferenceLine(position: number): string {
  return `Image ${position}: previous scene — keep only lighting, color grading and outfits; do not copy pose or composition.`;
}

export const SCENE_CHARACTER_SHEET_FRAME_NOTE =
  "Character reference images are character sheets (one character from several angles and with different facial expressions on a neutral background): use them only to keep the characters' appearance consistent. The result must be ONE single, cohesive scene frame, not a grid, collage or multi-panel sheet; do not copy the panel layout or the neutral sheet background.";

export function buildSceneAspectRatioHint(
  aspectRatio: VideoAspectRatio,
): string {
  return `Compose the shot for a ${aspectRatio} aspect ratio frame: the composition must fill this frame.`;
}

export function buildSceneLine(scenario: string): string {
  return `Scene: ${scenario}`;
}

export function buildVideoPromptFallback(scenario: string): string {
  return `<IMAGE_1> comes to life: ${scenario}`;
}
