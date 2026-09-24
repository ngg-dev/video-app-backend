import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCharacterDto } from './create-character.dto';
import { CHARACTER_APPEARANCE_FIELD_MAX_LENGTH } from '../constants/character-sheet.constant';

describe('CreateCharacterDto', () => {
  const validAppearance = {
    ageAndGender: '25, female',
    face: 'round face with large eyes',
    hair: 'long black hair',
    build: 'slim, 170cm',
    outfit: 'school uniform',
    footwear: 'white sneakers',
    accessories: 'golden pendant',
    palette: 'pastel pink and blue',
  };

  it('is valid with all required fields and appearance', async () => {
    // Arrange
    const dto = plainToInstance(CreateCharacterDto, {
      name: 'Боб',
      appearance: validAppearance,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('is invalid without appearance', async () => {
    // Arrange
    const dto = plainToInstance(CreateCharacterDto, {
      name: 'Боб',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    const appearanceError = errors.find((e) => e.property === 'appearance');
    expect(appearanceError).toBeDefined();
  });

  it('is invalid when appearance is missing a nested field', async () => {
    // Arrange
    const incompleteAppearance = {
      ageAndGender: '25, female',
      face: 'round face',
      hair: 'long black hair',
      build: 'slim',
      outfit: 'uniform',
      footwear: 'sneakers',
      accessories: 'pendant',
      // missing palette
    };

    const dto = plainToInstance(CreateCharacterDto, {
      name: 'Боб',
      appearance: incompleteAppearance,
    });

    // Act
    const errors = await validate(dto, { skipMissingProperties: false });

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    const appearanceError = errors.find((e) => e.property === 'appearance');
    expect(appearanceError).toBeDefined();
    if (appearanceError?.children) {
      const footwearOrPaletteError = appearanceError.children.some(
        (child) => child.property === 'palette',
      );
      expect(footwearOrPaletteError).toBeTruthy();
    }
  });

  it('is invalid when a nested appearance field is empty', async () => {
    // Arrange
    const dto = plainToInstance(CreateCharacterDto, {
      name: 'Боб',
      appearance: {
        ...validAppearance,
        face: '',
      },
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    const appearanceError = errors.find((e) => e.property === 'appearance');
    expect(appearanceError).toBeDefined();
    if (appearanceError?.children) {
      const faceError = appearanceError.children.some(
        (child) => child.property === 'face',
      );
      expect(faceError).toBeTruthy();
    }
  });

  it('is invalid when a nested appearance field exceeds max length', async () => {
    // Arrange
    const tooLongValue = 'x'.repeat(CHARACTER_APPEARANCE_FIELD_MAX_LENGTH + 1);
    const dto = plainToInstance(CreateCharacterDto, {
      name: 'Боб',
      appearance: {
        ...validAppearance,
        outfit: tooLongValue,
      },
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    const appearanceError = errors.find((e) => e.property === 'appearance');
    expect(appearanceError).toBeDefined();
    if (appearanceError?.children) {
      const outfitError = appearanceError.children.find(
        (child) => child.property === 'outfit',
      );
      expect(outfitError).toBeDefined();
      expect(outfitError?.constraints?.maxLength).toBeDefined();
    }
  });
});
