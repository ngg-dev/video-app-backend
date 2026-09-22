import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import {
  collectScenarioPlanViolations,
  parseScenarioPlan,
  toGeneratedScenes,
} from './scenario-plan-parse.util';

describe('Scenario Plan Parsing Utils', () => {
  const createCharacter = (
    name: string,
    description?: string,
  ): CharacterItemEntity =>
    ({
      id: `char-${name}`,
      name,
      description: description || '',
      imageUrl: '',
      collectionId: 'c-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as CharacterItemEntity;

  describe('parseScenarioPlan', () => {
    it('parses response in markdown fence', () => {
      // Arrange
      const raw =
        '```json\n[{"speakers":["Аня"],"text":"Аня входит в кафе."}]\n```';

      // Act
      const result = parseScenarioPlan(raw);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].speakers).toEqual(['Аня']);
      expect(result![0].text).toBe('Аня входит в кафе.');
    });

    it('returns null on invalid JSON', () => {
      // Arrange
      const raw = 'не json';

      // Act
      const result = parseScenarioPlan(raw);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when response is a JSON object instead of array', () => {
      // Arrange
      const raw = '{"speakers":["Аня"],"text":"Аня входит в кафе."}';

      // Act
      const result = parseScenarioPlan(raw);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when speakers is a string instead of array', () => {
      // Arrange
      const raw = '[{"speakers":"Аня","text":"Аня входит в кафе."}]';

      // Act
      const result = parseScenarioPlan(raw);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when text is empty after trim', () => {
      // Arrange
      const raw = '[{"speakers":["Аня"],"text":"   "}]';

      // Act
      const result = parseScenarioPlan(raw);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('collectScenarioPlanViolations', () => {
    it('returns empty array for valid plan', () => {
      // Arrange
      const characters = [createCharacter('Аня'), createCharacter('Борис')];
      const scenes = [
        { speakers: ['Аня'], text: 'Аня входит в кафе.' },
        { speakers: ['Борис'], text: 'Борис сидит за столом.' },
      ];

      // Act
      const violations = collectScenarioPlanViolations(scenes, characters, 2);

      // Assert
      expect(violations).toHaveLength(0);
    });

    it('reports scene count mismatch', () => {
      // Arrange
      const characters = [createCharacter('Аня')];
      const scenes = [
        { speakers: ['Аня'], text: 'Аня входит в кафе.' },
        { speakers: ['Аня'], text: 'Аня сидит за столом.' },
      ];

      // Act
      const violations = collectScenarioPlanViolations(scenes, characters, 3);

      // Assert
      expect(violations).not.toHaveLength(0);
      expect(
        violations.some((v) => v.includes('3') && v.includes('2')),
      ).toBeTruthy();
    });

    it('reports when mentioned character count exceeds limit', () => {
      // Arrange
      const characters = [
        createCharacter('Аня'),
        createCharacter('Борис'),
        createCharacter('Виктор'),
      ];
      const scenes = [
        {
          speakers: ['Аня', 'Борис'],
          text: 'Аня, Борис и Виктор встречаются в кафе.',
        },
      ];

      // Act
      const violations = collectScenarioPlanViolations(scenes, characters, 1);

      // Assert
      expect(violations).not.toHaveLength(0);
      expect(
        violations.some(
          (v) =>
            v.includes('MAX_SPEAKING_CHARACTERS_PER_SCENE') ||
            v.includes('не более') ||
            v.includes('Виктор'),
        ),
      ).toBeTruthy();
      expect(violations.some((v) => v.includes('Сцена 1'))).toBeTruthy();
    });

    it('reports declared speaker not mentioned in text', () => {
      // Arrange
      const characters = [createCharacter('Аня'), createCharacter('Борис')];
      const scenes = [
        {
          speakers: ['Аня'],
          text: 'Его зовут Борис, но он не появляется.',
        },
      ];

      // Act
      const violations = collectScenarioPlanViolations(scenes, characters, 1);

      // Assert
      expect(violations).not.toHaveLength(0);
      expect(
        violations.some(
          (v) => v.includes('заявлен говорящий') && v.includes('нет в тексте'),
        ),
      ).toBeTruthy();
    });

    it('reports character mentioned in text but not declared in speakers', () => {
      // Arrange
      const characters = [createCharacter('Аня'), createCharacter('Борис')];
      const scenes = [
        {
          speakers: ['Аня'],
          text: 'Аня встречает Бориса в кафе.',
        },
      ];

      // Act
      const violations = collectScenarioPlanViolations(scenes, characters, 1);

      // Assert
      expect(violations).not.toHaveLength(0);
      expect(
        violations.some(
          (v) => v.includes('в тексте названа') && v.includes('не заявленная'),
        ),
      ).toBeTruthy();
    });

    it('reports scene with no collection characters', () => {
      // Arrange
      const characters = [createCharacter('Аня')];
      const scenes = [
        {
          speakers: [],
          text: 'Какой-то прохожий идёт мимо кафе.',
        },
      ];

      // Act
      const violations = collectScenarioPlanViolations(scenes, characters, 1);

      // Assert
      expect(violations).not.toHaveLength(0);
      expect(
        violations.some((v) => v.includes('нет ни одного персонажа коллекции')),
      ).toBeTruthy();
    });
  });

  describe('toGeneratedScenes', () => {
    it('canonicalizes speaker names to database form', () => {
      // Arrange
      const characters = [createCharacter('Аня')];
      const scenes = [
        {
          speakers: ['аня'],
          text: 'Аня входит в кафе.',
        },
      ];

      // Act
      const result = toGeneratedScenes(scenes, characters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].speakers).toEqual(['Аня']);
      expect(result[0].text).toBe('Аня входит в кафе.');
    });
  });
});
