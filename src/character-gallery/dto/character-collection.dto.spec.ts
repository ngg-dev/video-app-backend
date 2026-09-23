import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCharacterCollectionDto } from './character-collection.dto';
import { COLLECTION_STYLE_DESCRIPTION_MAX_LENGTH } from '../constants/character-gallery.constant';
import { CharacterStyle } from 'src/shared/constants/character-style';

describe('CreateCharacterCollectionDto', () => {
  it('is valid without styleDescription', async () => {
    // Arrange
    const dto = plainToInstance(CreateCharacterCollectionDto, {
      name: 'Collection 1',
      style: CharacterStyle.Anime,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('is valid with styleDescription as a string', async () => {
    // Arrange
    const dto = plainToInstance(CreateCharacterCollectionDto, {
      name: 'Collection 1',
      style: CharacterStyle.Anime,
      styleDescription: 'flat colors',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('has error when styleDescription is not a string', async () => {
    // Arrange
    const dto = plainToInstance(CreateCharacterCollectionDto, {
      name: 'Collection 1',
      style: CharacterStyle.Anime,
      styleDescription: 123,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    const styleDescriptionError = errors.find(
      (e) => e.property === 'styleDescription',
    );
    expect(styleDescriptionError?.constraints?.isString).toBeDefined();
  });

  it('has error when styleDescription is an empty string', async () => {
    // Arrange
    const dto = plainToInstance(CreateCharacterCollectionDto, {
      name: 'Collection 1',
      style: CharacterStyle.Anime,
      styleDescription: '',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    const styleDescriptionError = errors.find(
      (e) => e.property === 'styleDescription',
    );
    expect(styleDescriptionError?.constraints?.isNotEmpty).toBeDefined();
  });

  it('has error when styleDescription exceeds max length', async () => {
    // Arrange
    const tooLong = 'a'.repeat(COLLECTION_STYLE_DESCRIPTION_MAX_LENGTH + 1);
    const dto = plainToInstance(CreateCharacterCollectionDto, {
      name: 'Collection 1',
      style: CharacterStyle.Anime,
      styleDescription: tooLong,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    const styleDescriptionError = errors.find(
      (e) => e.property === 'styleDescription',
    );
    expect(styleDescriptionError?.constraints?.maxLength).toBeDefined();
  });

  it('is valid when styleDescription is exactly at max length', async () => {
    // Arrange
    const maxLength = 'a'.repeat(COLLECTION_STYLE_DESCRIPTION_MAX_LENGTH);
    const dto = plainToInstance(CreateCharacterCollectionDto, {
      name: 'Collection 1',
      style: CharacterStyle.Anime,
      styleDescription: maxLength,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('does not have styleAnchorImageUrl as a decorated field', () => {
    // Arrange & Act
    // styleAnchorImageUrl is not declared as a field in the DTO
    const keys = Object.getOwnPropertyNames(
      CreateCharacterCollectionDto.prototype,
    );

    // Assert
    expect(keys).not.toContain('styleAnchorImageUrl');
  });
});
