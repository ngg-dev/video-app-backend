import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import { selectMentionedCharacters } from 'src/character-gallery/utils/character-collection.util';
import { normalizeScenario } from 'src/create-video/utils/scenario.util';
import { isNotNull, isNotUndefined, isNull } from 'src/shared/utils';
import { GeneratedSceneDto } from '../dto/scenario-plan.dto';
import {
  MAX_SCENE_TEXT_LENGTH,
  MAX_SPEAKING_CHARACTERS_PER_SCENE,
  SCENE_END_LABEL,
  SCENE_MIDDLE_LABEL,
  SCENE_START_LABEL,
} from '../constants/scenario-plan.constant';

export interface ParsedScene {
  speakers: string[];
  text: string;
}

function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);

  return isNotNull(fenceMatch) ? fenceMatch[1].trim() : trimmed;
}

function isParsedScene(value: unknown): value is ParsedScene {
  if (isNull(value) || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  const hasValidSpeakers =
    Array.isArray(candidate.speakers) &&
    candidate.speakers.every((speaker) => typeof speaker === 'string');
  const hasValidText =
    typeof candidate.text === 'string' && candidate.text.trim().length > 0;

  return hasValidSpeakers && hasValidText;
}

/** Срезает ```json/``` обёртку, парсит JSON, проверяет форму. null — ответ непригоден. */
export function parseScenarioPlan(raw: string): ParsedScene[] | null {
  const candidateText = stripMarkdownFence(raw);

  let parsed: unknown;

  try {
    parsed = JSON.parse(candidateText);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || !parsed.every(isParsedScene)) {
    return null;
  }

  return parsed;
}

function normalizeSpeakerName(name: string): string {
  return name.trim().toLowerCase();
}

/** [] — план валиден. Иначе — список человекочитаемых нарушений для repair-подсказки. */
export function collectScenarioPlanViolations(
  scenes: ParsedScene[],
  characters: CharacterItemEntity[],
  expectedSceneCount: number,
): string[] {
  const violations: string[] = [];

  if (scenes.length !== expectedSceneCount) {
    violations.push(
      `Ожидалось ровно ${expectedSceneCount} сцен, получено ${scenes.length}.`,
    );
  }

  scenes.forEach((scene, index) => {
    const sceneNumber = index + 1;

    if (scene.text.length > MAX_SCENE_TEXT_LENGTH) {
      violations.push(
        `Сцена ${sceneNumber}: текст длиннее ${MAX_SCENE_TEXT_LENGTH} символов.`,
      );
    }

    const startIndex = scene.text.indexOf(SCENE_START_LABEL);
    const middleIndex = scene.text.indexOf(SCENE_MIDDLE_LABEL);
    const endIndex = scene.text.indexOf(SCENE_END_LABEL);

    if (
      startIndex === -1 ||
      middleIndex === -1 ||
      endIndex === -1 ||
      !(startIndex < middleIndex && middleIndex < endIndex)
    ) {
      violations.push(
        `Сцена ${sceneNumber}: текст должен содержать метки "${SCENE_START_LABEL}", "${SCENE_MIDDLE_LABEL}" и "${SCENE_END_LABEL}" именно в этом порядке.`,
      );
    }

    const mentioned = selectMentionedCharacters(
      normalizeScenario(scene.text),
      characters,
    ).persons;

    if (mentioned.length > MAX_SPEAKING_CHARACTERS_PER_SCENE) {
      violations.push(
        `Сцена ${sceneNumber}: в тексте названо ${mentioned.length} персонажей коллекции (${mentioned
          .map(({ name }) => name)
          .join(
            ', ',
          )}), допустимо не более ${MAX_SPEAKING_CHARACTERS_PER_SCENE}.`,
      );
    }

    const mentionedNames = new Set(
      mentioned.map(({ name }) => normalizeSpeakerName(name)),
    );
    const speakerNames = new Set(
      scene.speakers.map((speaker) => normalizeSpeakerName(speaker)),
    );

    for (const speaker of scene.speakers) {
      if (!mentionedNames.has(normalizeSpeakerName(speaker))) {
        violations.push(
          `Сцена ${sceneNumber}: заявлен говорящий ${speaker}, но его имени нет в тексте.`,
        );
      }
    }

    for (const person of mentioned) {
      if (!speakerNames.has(normalizeSpeakerName(person.name))) {
        violations.push(
          `Сцена ${sceneNumber}: в тексте названа ${person.name}, не заявленная в speakers.`,
        );
      }
    }

    if (mentioned.length === 0) {
      violations.push(
        `Сцена ${sceneNumber}: в сцене нет ни одного персонажа коллекции.`,
      );
    }
  });

  return violations;
}

/** Канонизирует speakers к именам из коллекции (регистр/порядок как в БД). */
export function toGeneratedScenes(
  scenes: ParsedScene[],
  characters: CharacterItemEntity[],
): GeneratedSceneDto[] {
  return scenes.map((scene) => {
    const mentioned = selectMentionedCharacters(
      normalizeScenario(scene.text),
      characters,
    ).persons;

    const canonicalSpeakers = scene.speakers
      .map((speaker) =>
        mentioned.find(
          (person) =>
            normalizeSpeakerName(person.name) === normalizeSpeakerName(speaker),
        ),
      )
      .filter(isNotUndefined)
      .map((person) => person.name);

    return {
      speakers: canonicalSpeakers,
      text: scene.text,
    };
  });
}
