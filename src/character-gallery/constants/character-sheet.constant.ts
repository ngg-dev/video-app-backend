import type {
  AspectRatio,
  XaiImageResolution,
} from 'src/ai-providers/xai/types/xai.types';
import type { CharacterAppearance } from '../types/character-appearance.types';

export const CHARACTER_APPEARANCE_FIELD_MAX_LENGTH = 1000;

export const CHARACTER_APPEARANCE_FIELDS: ReadonlyArray<{
  key: keyof CharacterAppearance;
  label: string;
}> = [
  { key: 'ageAndGender', label: 'Age and gender' },
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'build', label: 'Build and height' },
  { key: 'outfit', label: 'Outfit' },
  { key: 'footwear', label: 'Footwear' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'palette', label: 'Color palette' },
];

export const CHARACTER_SHEET_VIEWS: ReadonlyArray<string> = [
  'front view',
  'three-quarter view',
  'side (profile) view',
  'back view',
];

export const CHARACTER_SHEET_EMOTIONS: ReadonlyArray<string> = [
  'neutral',
  'joy',
  'sadness',
  'anger',
  'surprise',
  'laughter',
  'fear',
  'thoughtful',
];

export const CHARACTER_SHEET_PROMPT_TEMPLATE = [
  'Character reference sheet of a single character on one image, on a plain neutral light background with even studio lighting.',
  '{style}',
  'Character description:\n{character}',
  'Layout: the top row shows {viewCount} full-body views of the character at the same scale, in a neutral standing pose with arms relaxed along the body: {views}. The bottom row shows {emotionCount} large head portraits of the same character with different facial expressions: {emotions}.',
  'Consistency: the exact same face, age, hairstyle, body proportions, outfit, footwear, accessories and color palette in every panel; only the viewing angle and the facial expression change.',
  'No text, no captions, no labels, no watermarks, no additional characters.',
].join('\n');

export const CHARACTER_SHEET_ASPECT_RATIO: AspectRatio = '16:9';
export const CHARACTER_SHEET_RESOLUTION: XaiImageResolution = '2k';
