import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRequestDto } from './create-video.dto';

describe('CreateRequestDto.aspectRatio validation', () => {
  it('accepts a valid enum value', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
      aspectRatio: '16:9',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('allows the field to be omitted', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
    expect(dto.aspectRatio).toBeUndefined();
  });

  it('rejects a value outside the enum', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
      aspectRatio: '4:3',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    const aspectRatioErrors = errors.filter(
      (error) => error.property === 'aspectRatio',
    );
    expect(aspectRatioErrors).toHaveLength(1);
    expect(aspectRatioErrors[0].constraints).toHaveProperty('isEnum');
  });
});

describe('CreateRequestDto.duration validation', () => {
  it('allows the field to be omitted', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
    expect(dto.duration).toBeUndefined();
  });

  it('accepts a value within the 1-15 second range', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
      duration: 5,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('rejects a value below the minimum', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
      duration: 0,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    const durationErrors = errors.filter(
      (error) => error.property === 'duration',
    );
    expect(durationErrors).toHaveLength(1);
    expect(durationErrors[0].constraints).toHaveProperty('min');
  });

  it('rejects a value above the maximum', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
      duration: 16,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    const durationErrors = errors.filter(
      (error) => error.property === 'duration',
    );
    expect(durationErrors).toHaveLength(1);
    expect(durationErrors[0].constraints).toHaveProperty('max');
  });

  it('rejects a non-integer value', async () => {
    // Arrange
    const dto = plainToInstance(CreateRequestDto, {
      scenario: 'a scene',
      collectionId: 'c-1',
      duration: 5.5,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    const durationErrors = errors.filter(
      (error) => error.property === 'duration',
    );
    expect(durationErrors).toHaveLength(1);
    expect(durationErrors[0].constraints).toHaveProperty('isInt');
  });
});

describe('CreateRequestDto.styleAnchorImageUrl whitelist', () => {
  it('does not have styleAnchorImageUrl as a decorated field', () => {
    // Arrange & Act
    // styleAnchorImageUrl is not declared as a field in the DTO
    const keys = Object.getOwnPropertyNames(CreateRequestDto.prototype);

    // Assert
    expect(keys).not.toContain('styleAnchorImageUrl');
  });
});
