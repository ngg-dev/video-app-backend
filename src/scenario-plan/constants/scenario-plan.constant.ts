import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';

export const MAX_SPEAKING_CHARACTERS_PER_SCENE = 2;
export const MAX_IDEA_LENGTH = 5_000;
/** Должен оставаться <= @MaxLength в VideoPipeRequestDto.scenarios. */
export const MAX_SCENE_TEXT_LENGTH = 100_000;

export const SCENE_START_LABEL = 'Начало:';
export const SCENE_MIDDLE_LABEL = 'Середина:';
export const SCENE_END_LABEL = 'Конец:';

export const SCENARIO_PLAN_INSTRUCTIONS = [
  'You are a screenwriter turning a video idea into a scenario plan for a short video pipeline.',
  'Respond with a JSON array only, no markdown fences, no explanations: [{ "speakers": ["Name"], "text": "..." }].',
  'Produce exactly the requested number of scenes, one array element per scene, in chronological order.',
  `Each scene's "speakers" array must contain at most ${MAX_SPEAKING_CHARACTERS_PER_SCENE} names, and only names taken verbatim from the provided character roster (same spelling, same grammatical case).`,
  'Every name listed in "speakers" must literally appear in "text" in its nominative form; roster character names that are not listed in "speakers" must not appear in "text" at all.',
  'Other people present in the scene must be described generically (e.g. "a passerby", "a barista") and never referred to by a roster character name.',
  'The scene text must be in Russian and include action, dialogue lines, and a camera hint.',
  `Structure each scene's "text" as exactly three labeled parts, in this order and each on its own line: "${SCENE_START_LABEL}" describing the location and the starting position/pose of every character present, "${SCENE_MIDDLE_LABEL}" describing how the action and dialogue develop, and "${SCENE_END_LABEL}" describing the location and the ending position/pose of every character present. All three labels must appear literally in "text", in that order.`,
];

export function buildScenarioPlanSceneCountHint(sceneCount: number): string {
  return `Number of scenes required: ${sceneCount}.`;
}

export function buildScenarioPlanRosterHint(
  characters: CharacterItemEntity[],
): string {
  if (!characters.length) {
    return '';
  }

  const roster = characters
    .map(({ name, appearance }) => `${name} — ${appearance.ageAndGender}`)
    .join('\n');

  return `Character roster (use only these names in "speakers" and in "text"):\n${roster}`;
}

export function buildScenarioPlanStyleHint(collectionStyle: string): string {
  return collectionStyle
    ? `Visual style shared by the whole video: ${collectionStyle}.`
    : '';
}

export function buildScenarioPlanIdeaLine(idea: string): string {
  return `Idea: ${idea}`;
}

export function buildScenarioPlanRepairHint(violations: string[]): string {
  if (!violations.length) {
    return '';
  }

  return `The previous response was invalid. Fix the following issues and respond again with a full, corrected JSON array following the same rules:\n${violations.join('\n')}`;
}
