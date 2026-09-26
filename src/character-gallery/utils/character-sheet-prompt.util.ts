import {
  CHARACTER_APPEARANCE_FIELDS,
  CHARACTER_SHEET_EMOTIONS,
  CHARACTER_SHEET_PROMPT_TEMPLATE,
  CHARACTER_SHEET_VIEWS,
} from '../constants/character-sheet.constant';
import type {
  CharacterAppearance,
  CharacterSheetStyle,
} from '../types/character-appearance.types';

export function buildCharacterBlock(appearance: CharacterAppearance): string {
  return CHARACTER_APPEARANCE_FIELDS.map(
    ({ key, label }) => `${label}: ${appearance[key]}`,
  ).join('\n');
}

export function buildCharacterSheetPrompt({
  style,
  styleDescription,
  characterBlock,
}: CharacterSheetStyle & { characterBlock: string }): string {
  const styleClause = style
    ? [`Художественный стиль: ${style}.`, styleDescription]
        .filter(Boolean)
        .join(' ')
    : '';

  const slots: Record<string, string> = {
    style: styleClause,
    character: characterBlock,
    viewCount: String(CHARACTER_SHEET_VIEWS.length),
    views: CHARACTER_SHEET_VIEWS.join(', '),
    emotionCount: String(CHARACTER_SHEET_EMOTIONS.length),
    emotions: CHARACTER_SHEET_EMOTIONS.join(', '),
  };

  return CHARACTER_SHEET_PROMPT_TEMPLATE.replace(
    /\{(\w+)\}/g,
    (_, slot: string) => slots[slot] ?? '',
  )
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
}
