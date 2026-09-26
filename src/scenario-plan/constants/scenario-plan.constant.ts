import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';

export const MAX_SPEAKING_CHARACTERS_PER_SCENE = 2;
export const MAX_IDEA_LENGTH = 5_000;
/** Должен оставаться <= @MaxLength в VideoPipeRequestDto.scenarios. */
export const MAX_SCENE_TEXT_LENGTH = 100_000;

export const SCENE_START_LABEL = 'Начало:';
export const SCENE_MIDDLE_LABEL = 'Середина:';
export const SCENE_END_LABEL = 'Конец:';

export const SCENARIO_PLAN_INSTRUCTIONS = [
  'Ты сценарист и превращаешь идею видео в план сценария для конвейера коротких видео.',
  'Отвечай только JSON-массивом, без markdown-обёрток и пояснений: [{ "speakers": ["Имя"], "text": "..." }].',
  'Создай ровно запрошенное количество сцен, один элемент массива на сцену, в хронологическом порядке.',
  `В массиве "speakers" каждой сцены должно быть не более ${MAX_SPEAKING_CHARACTERS_PER_SCENE} имён, и только имена, дословно взятые из предоставленного списка персонажей (то же написание, тот же падеж).`,
  'Каждое имя из "speakers" должно буквально встречаться в "text" в именительном падеже; имена персонажей из списка, не указанные в "speakers", не должны встречаться в "text" вообще.',
  'Других людей в сцене описывай обобщённо (например, «прохожий», «бариста») и никогда не называй их именем персонажа из списка.',
  'Текст сцены должен быть на русском языке и включать действие и реплики диалога.',
  `Структурируй "text" каждой сцены ровно из трёх помеченных частей в таком порядке, каждая на отдельной строке: "${SCENE_START_LABEL}" — локация и начальное положение/поза каждого присутствующего персонажа, "${SCENE_MIDDLE_LABEL}" — как развиваются действие и диалог, "${SCENE_END_LABEL}" — локация и конечное положение/поза каждого присутствующего персонажа. Все три метки должны буквально присутствовать в "text" в этом порядке.`,
];

export function buildScenarioPlanSceneCountHint(sceneCount: number): string {
  return `Требуемое количество сцен: ${sceneCount}.`;
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

  return `Список персонажей (используй только эти имена в "speakers" и в "text"):\n${roster}`;
}

export function buildScenarioPlanStyleHint(collectionStyle: string): string {
  return collectionStyle
    ? `Визуальный стиль всего видео: ${collectionStyle}.`
    : '';
}

export function buildScenarioPlanIdeaLine(idea: string): string {
  return `Идея: ${idea}`;
}

export function buildScenarioPlanRepairHint(violations: string[]): string {
  if (!violations.length) {
    return '';
  }

  return `Предыдущий ответ был некорректным. Исправь следующие проблемы и ответь снова полным исправленным JSON-массивом по тем же правилам:\n${violations.join('\n')}`;
}
