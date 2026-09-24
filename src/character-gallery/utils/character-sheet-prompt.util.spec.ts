import {
  CHARACTER_APPEARANCE_FIELDS,
  CHARACTER_SHEET_EMOTIONS,
  CHARACTER_SHEET_VIEWS,
} from '../constants/character-sheet.constant';
import {
  buildCharacterBlock,
  buildCharacterSheetPrompt,
} from './character-sheet-prompt.util';
import type {
  CharacterAppearance,
  CharacterSheetStyle,
} from '../types/character-appearance.types';

describe('character-sheet-prompt.util', () => {
  const fixtureAppearance: CharacterAppearance = {
    ageAndGender: 'AGE',
    face: 'FACE',
    hair: 'HAIR',
    build: 'BUILD',
    outfit: 'OUTFIT',
    footwear: 'FOOTWEAR',
    accessories: 'ACCESSORIES',
    palette: 'PALETTE',
  };

  describe('buildCharacterBlock', () => {
    it('outputs fields in fixed order from CHARACTER_APPEARANCE_FIELDS', () => {
      // Arrange
      const reversedAppearance: CharacterAppearance = {
        palette: 'PALETTE',
        accessories: 'ACCESSORIES',
        footwear: 'FOOTWEAR',
        outfit: 'OUTFIT',
        build: 'BUILD',
        hair: 'HAIR',
        face: 'FACE',
        ageAndGender: 'AGE',
      };

      // Act
      const result = buildCharacterBlock(reversedAppearance);

      // Assert
      const lines = result.split('\n');
      expect(lines).toHaveLength(8);
      for (let i = 0; i < CHARACTER_APPEARANCE_FIELDS.length; i++) {
        const field = CHARACTER_APPEARANCE_FIELDS[i];
        expect(lines[i]).toMatch(new RegExp(`^${field.label}: `));
      }
    });

    it('assigns each value to its corresponding label', () => {
      // Arrange
      const appearance = fixtureAppearance;

      // Act
      const result = buildCharacterBlock(appearance);

      // Assert
      for (const { key, label } of CHARACTER_APPEARANCE_FIELDS) {
        expect(result).toContain(`${label}: ${appearance[key]}`);
      }
    });
  });

  describe('buildCharacterSheetPrompt', () => {
    it('includes style and styleDescription in the output', () => {
      // Arrange
      const style: CharacterSheetStyle = {
        style: 'anime',
        styleDescription: 'flat cel shading',
      };
      const characterBlock = buildCharacterBlock(fixtureAppearance);

      // Act
      const result = buildCharacterSheetPrompt({
        ...style,
        characterBlock,
      });

      // Assert
      expect(result).toContain('anime.');
      expect(result).toContain('flat cel shading');
      expect(result).toContain(characterBlock);
    });

    it('renders style without description when styleDescription is null', () => {
      // Arrange
      const style: CharacterSheetStyle = {
        style: 'anime',
        styleDescription: null,
      };
      const characterBlock = buildCharacterBlock(fixtureAppearance);

      // Act
      const result = buildCharacterSheetPrompt({
        ...style,
        characterBlock,
      });

      // Assert
      expect(result).toContain('anime.');
      expect(result).not.toContain('null');
      expect(result).not.toContain('undefined');
      expect(result).not.toMatch(/ {2}/); // no double spaces
    });

    it('omits style clause entirely when style is null', () => {
      // Arrange
      const style: CharacterSheetStyle = {
        style: null,
        styleDescription: null,
      };
      const characterBlock = buildCharacterBlock(fixtureAppearance);

      // Act
      const result = buildCharacterSheetPrompt({
        ...style,
        characterBlock,
      });

      // Assert
      expect(result).not.toContain('Art style');
      expect(result).not.toContain('null');
      expect(result).not.toContain('undefined');
      expect(result).not.toMatch(/ {2}/); // no double spaces
      expect(result).not.toMatch(/\n\n/); // no blank lines
      expect(result).toContain(characterBlock);
    });

    it('includes all views and emotions from constants', () => {
      // Arrange
      const style: CharacterSheetStyle = {
        style: 'noir',
        styleDescription: 'ink wash',
      };
      const characterBlock = buildCharacterBlock(fixtureAppearance);

      // Act
      const result = buildCharacterSheetPrompt({
        ...style,
        characterBlock,
      });

      // Assert
      for (const view of CHARACTER_SHEET_VIEWS) {
        expect(result).toContain(view);
      }
      for (const emotion of CHARACTER_SHEET_EMOTIONS) {
        expect(result).toContain(emotion);
      }
      expect(result).toContain(String(CHARACTER_SHEET_VIEWS.length));
      expect(result).toContain(String(CHARACTER_SHEET_EMOTIONS.length));
    });

    it('does not leave unfilled template slots', () => {
      // Arrange
      const style: CharacterSheetStyle = {
        style: 'cinematic',
        styleDescription: 'dramatic lighting',
      };
      const characterBlock = buildCharacterBlock(fixtureAppearance);

      // Act
      const result = buildCharacterSheetPrompt({
        ...style,
        characterBlock,
      });

      // Assert
      expect(result).not.toMatch(/\{[A-Za-z]+\}/);
    });
  });
});
