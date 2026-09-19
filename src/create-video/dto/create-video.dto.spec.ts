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
