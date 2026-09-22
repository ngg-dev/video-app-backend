import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  MAX_SCENE_COUNT,
  MIN_SCENE_COUNT,
} from 'src/shared/constants/scene-count';
import { VideoPipeRequestDto } from './video-pipe.dto';

describe('VideoPipeRequestDto.scenarios validation', () => {
  it('rejects fewer than MIN_SCENE_COUNT scenarios', async () => {
    // Arrange
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios: ['a'],
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    const scenarioErrors = errors.filter(
      (error) => error.property === 'scenarios',
    );
    expect(scenarioErrors).toHaveLength(1);
    expect(scenarioErrors[0].constraints).toHaveProperty('arrayMinSize');
  });

  it('rejects more than MAX_SCENE_COUNT scenarios', async () => {
    // Arrange
    const scenarios = Array.from({ length: MAX_SCENE_COUNT + 1 }, (_, i) =>
      String.fromCharCode(97 + (i % 26)),
    );
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios,
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    const scenarioErrors = errors.filter(
      (error) => error.property === 'scenarios',
    );
    expect(scenarioErrors).toHaveLength(1);
    expect(scenarioErrors[0].constraints).toHaveProperty('arrayMaxSize');
  });

  it('accepts MIN_SCENE_COUNT scenarios', async () => {
    // Arrange
    const scenarios = Array.from({ length: MIN_SCENE_COUNT }, (_, i) =>
      String.fromCharCode(97 + (i % 26)),
    );
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios,
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('accepts MAX_SCENE_COUNT scenarios', async () => {
    // Arrange
    const scenarios = Array.from({ length: MAX_SCENE_COUNT }, (_, i) =>
      String.fromCharCode(97 + (i % 26)),
    );
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios,
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty scenario string within the array', async () => {
    // Arrange
    const scenarios = Array.from({ length: MIN_SCENE_COUNT }, (_, i) =>
      i === MIN_SCENE_COUNT - 1 ? '' : String.fromCharCode(97 + (i % 26)),
    );
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios,
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    const scenarioErrors = errors.filter(
      (error) => error.property === 'scenarios',
    );
    expect(scenarioErrors).toHaveLength(1);
    expect(scenarioErrors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('allows aspectRatio to be omitted', async () => {
    // Arrange
    const scenarios = Array.from({ length: MIN_SCENE_COUNT }, (_, i) =>
      String.fromCharCode(97 + (i % 26)),
    );
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios,
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
    expect(dto.aspectRatio).toBeUndefined();
  });

  it('rejects an aspectRatio outside the enum', async () => {
    // Arrange
    const scenarios = Array.from({ length: MIN_SCENE_COUNT }, (_, i) =>
      String.fromCharCode(97 + (i % 26)),
    );
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios,
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
