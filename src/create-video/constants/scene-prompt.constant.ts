import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

export const SCENE_IMAGE_PROMPT_INSTRUCTIONS = [
  'Ты промпт-инженер и пишешь промпт для Grok Imagine (модель xAI для генерации изображений по тексту).',
  'Grok Imagine понимает естественный язык, а не наборы ключевых слов через запятую, поэтому пиши связными предложениями, а не списком тегов.',
  'Перепиши описание сцены ниже в один яркий, максимально конкретный абзац, охватив в таком порядке:',
  '1) Субъект — кто/что находится в сцене и что делает.',
  '2) Окружение — место действия, фон и время суток.',
  '3) Освещение — источник и направление света (например, мягкий утренний контровой свет, резкое неоновое свечение).',
  '4) Камера — тип кадра, ракурс и ощущение объектива (например, широкий план с нижней точки, крупный план на 35 мм).',
  '5) Стиль и настроение — художественный стиль, цветовая палитра, атмосфера.',
  'Оставайся верным исходному сценарию: не придумывай новых персонажей, локации и сюжетные ходы, которые из него не следуют.',
  'Отвечай только абзацем с промптом, без заголовков, пояснений и кавычек.',
];

export const SCENE_VIDEO_NO_SPEECH_RULE =
  'Не включай в промпт реплики и речь персонажей: персонажи не говорят и не озвучиваются.';

export const SCENE_VIDEO_STATIC_CAMERA_RULE = 'Камера остаётся неподвижной.';

export const SCENE_VIDEO_PROMPT_INSTRUCTIONS = [
  'Ты промпт-инженер и пишешь промпт движения для Grok Imagine (модель xAI для генерации видео по референсу), который оживит уже сгенерированное статичное изображение.',
  'Статичное изображение передаётся модели как референс, и в промпте на него нужно ссылаться буквальным тегом <IMAGE_1> (например, «персонаж из <IMAGE_1> поворачивается и идёт вперёд»). Используй <IMAGE_1> хотя бы один раз.',
  'Перепиши описание сцены ниже в один яркий абзац, описывающий только действие и движение персонажей и объектов, которые должны происходить, когда <IMAGE_1> оживает.',
  SCENE_VIDEO_NO_SPEECH_RULE,
  `${SCENE_VIDEO_STATIC_CAMERA_RULE} Указания камеры из описания сцены игнорируй.`,
  'Не меняй и не описывай заново внешность персонажей, художественный стиль и композицию сцены — их уже задаёт <IMAGE_1>.',
  'Не придумывай новых персонажей и локации, которые уже не подразумеваются сценой.',
  'Отвечай только абзацем с промптом, без заголовков, пояснений и кавычек.',
];

export function buildSceneImageCharactersHint(
  characterNames: string[],
): string {
  return characterNames.length
    ? `Персонажи в сцене (сохраняй их внешность согласованной с референсами): ${characterNames.join(', ')}.`
    : '';
}

export function buildSceneVideoCharactersHint(
  characterNames: string[],
): string {
  return characterNames.length
    ? `Персонажи в сцене: ${characterNames.join(', ')}.`
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

  return `Оформи изображение в следующем визуальном стиле: ${collectionStyle}.${descriptionClause}`;
}

export function buildSceneStyleTag(
  collectionStyle: string | null,
  styleDescription?: string | null,
): string {
  if (!collectionStyle) {
    return '';
  }

  const descriptionClause = styleDescription ? ` ${styleDescription}` : '';

  return `Визуальный стиль: ${collectionStyle}.${descriptionClause} Строго сохраняй этот визуальный стиль.`;
}

export function buildSceneCharacterReferenceLine(
  position: number,
  name?: string,
): string {
  return `Изображение ${position}: ${name || 'персонаж'} — точно сохраняй лицо, волосы, телосложение, одежду.`;
}

export function buildSceneLocationReferenceLine(position: number): string {
  return `Изображение ${position}: локация — воспроизведи окружение и архитектуру.`;
}

export function buildSceneStyleAnchorReferenceLine(position: number): string {
  return `Изображение ${position}: эталон стиля — используй только цветовую палитру, технику рендеринга, линии и светотень; не копируй композицию, фон, персонажей и сюжет.`;
}

export function buildScenePreviousSceneReferenceLine(position: number): string {
  return `Изображение ${position}: предыдущая сцена — сохрани только освещение, цветокоррекцию и одежду; не копируй позу и композицию.`;
}

export const SCENE_CHARACTER_SHEET_FRAME_NOTE =
  'Референсы персонажей — это мастер-листы (один персонаж с нескольких ракурсов и с разной мимикой на нейтральном фоне): используй их только для сохранения внешности персонажей. Результат должен быть ОДНИМ цельным кадром сцены, а не сеткой, коллажем или многопанельным листом; не копируй раскладку панелей и нейтральный фон листа.';

export function buildSceneAspectRatioHint(
  aspectRatio: VideoAspectRatio,
): string {
  return `Скомпонуй кадр под соотношение сторон ${aspectRatio}: композиция должна заполнять весь кадр.`;
}

export function buildSceneLine(scenario: string): string {
  return `Сцена: ${scenario}`;
}

export function buildVideoPromptFallback(scenario: string): string {
  return `<IMAGE_1> оживает: ${scenario} ${SCENE_VIDEO_NO_SPEECH_RULE} ${SCENE_VIDEO_STATIC_CAMERA_RULE}`;
}
