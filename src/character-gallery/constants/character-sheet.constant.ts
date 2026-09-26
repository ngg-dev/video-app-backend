import type {
  AspectRatio,
  XaiImageResolution,
} from '@ai-providers/xai/types/xai.types';
import type { CharacterAppearance } from '../types/character-appearance.types';

export const CHARACTER_APPEARANCE_FIELD_MAX_LENGTH = 1000;

export const CHARACTER_APPEARANCE_FIELDS: ReadonlyArray<{
  key: keyof CharacterAppearance;
  label: string;
}> = [
  { key: 'ageAndGender', label: 'Возраст и пол' },
  { key: 'face', label: 'Лицо' },
  { key: 'hair', label: 'Волосы' },
  { key: 'build', label: 'Телосложение и рост' },
  { key: 'outfit', label: 'Одежда' },
  { key: 'footwear', label: 'Обувь' },
  { key: 'accessories', label: 'Аксессуары' },
  { key: 'palette', label: 'Цветовая палитра' },
];

export const CHARACTER_SHEET_VIEWS: ReadonlyArray<string> = [
  'вид спереди',
  'вид в три четверти',
  'вид сбоку (профиль)',
  'вид сзади',
];

export const CHARACTER_SHEET_EMOTIONS: ReadonlyArray<string> = [
  'нейтральное',
  'радость',
  'грусть',
  'злость',
  'удивление',
  'смех',
  'страх',
  'задумчивость',
];

export const CHARACTER_SHEET_PROMPT_TEMPLATE = [
  'Мастер-лист одного персонажа на одном изображении, на простом нейтральном светлом фоне с ровным студийным освещением.',
  '{style}',
  'Описание персонажа:\n{character}',
  'Раскладка: в верхнем ряду {viewCount} вида персонажа в полный рост в одном масштабе, в нейтральной стоячей позе с расслабленными вдоль тела руками: {views}. В нижнем ряду {emotionCount} крупных портретов головы того же персонажа с разной мимикой: {emotions}.',
  'Согласованность: абсолютно одинаковые лицо, возраст, причёска, пропорции тела, одежда, обувь, аксессуары и цветовая палитра на каждой панели; меняются только ракурс и выражение лица.',
  'Без текста, подписей, надписей, водяных знаков и дополнительных персонажей.',
].join('\n');

export const CHARACTER_SHEET_ASPECT_RATIO: AspectRatio = '16:9';
export const CHARACTER_SHEET_RESOLUTION: XaiImageResolution = '2k';
