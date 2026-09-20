import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VideoPipeRequestDto } from './video-pipe.dto';

describe('VideoPipeRequestDto.scenarios validation', () => {
  const baseScenarios = ['a', 'b', 'c', 'd', 'e'];

  it('accepts exactly 5 scenario strings', async () => {
    // Arrange
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios: baseScenarios,
      collectionId: 'c-1',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('rejects fewer than 5 scenarios', async () => {
    // Arrange
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios: baseScenarios.slice(0, 4),
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

  it('rejects more than 5 scenarios', async () => {
    // Arrange
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios: [...baseScenarios, 'f'],
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

  it('rejects an empty scenario string within the array', async () => {
    // Arrange
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios: ['a', 'b', 'c', 'd', ''],
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
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios: baseScenarios,
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
    const dto = plainToInstance(VideoPipeRequestDto, {
      scenarios: baseScenarios,
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
