export const VIDEO_STYLE_ANCHOR_SHEET_NOTE =
  'Референсы — это многопанельные мастер-листы персонажей (несколько ракурсов и выражений лица одного персонажа); результат должен быть ОДНИМ общим кадром, а не сеткой панелей, и не должен копировать раскладку листа.';

export function buildVideoStyleAnchorPrompt(
  style: string,
  styleDescription: string | null,
): string {
  const descriptionClause = styleDescription ? ` ${styleDescription}` : '';

  return `Групповой портрет всех персонажей с референсных изображений, стоящих вместе в одном кадре. Визуальный стиль: ${style}.${descriptionClause} Сохраняй дизайн, пропорции, одежду и цвета каждого персонажа верными его референсу, отрисовывая их строго в этом визуальном стиле. ${VIDEO_STYLE_ANCHOR_SHEET_NOTE} Простой нейтральный фон, ровное студийное освещение, без текста и подписей.`;
}
