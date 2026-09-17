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
