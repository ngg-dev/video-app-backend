import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VideoPipeRequestDto } from './video-pipe.dto';

describe('VideoPipeRequestDto.scenarios validation', () => {
  // Helper to generate scenarios array of length n
  const makeScenarios = (n: number): string[] =>
    Array.from({ length: n }, (_, i) => `s${i + 1}`);

  describe('Test 1: DTO accepts arbitrary count of scenarios', () => {
    it.each([1, 2, 3, 7, 12])('accepts %d scenario(s)', async (n: number) => {
      // Arrange
      const dto = plainToInstance(VideoPipeRequestDto, {
        scenarios: makeScenarios(n),
        collectionId: 'c-1',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe('Test 2: DTO accepts count greatly exceeding former limit', () => {
    it('accepts 50 scenarios (no upper limit)', async () => {
      // Arrange
      const dto = plainToInstance(VideoPipeRequestDto, {
        scenarios: makeScenarios(50),
        collectionId: 'c-1',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe('Test 3: DTO rejects empty scenarios array', () => {
    it('rejects empty array', async () => {
      // Arrange
      const dto = plainToInstance(VideoPipeRequestDto, {
        scenarios: [],
        collectionId: 'c-1',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const scenarioErrors = errors.filter(
        (error) => error.property === 'scenarios',
      );
      expect(scenarioErrors).toHaveLength(1);
      expect(scenarioErrors[0].constraints).toHaveProperty('arrayNotEmpty');
    });
  });

  describe('Test 4: DTO rejects missing scenarios field', () => {
    it('rejects missing scenarios property', async () => {
      // Arrange
      const dto = plainToInstance(VideoPipeRequestDto, {
        collectionId: 'c-1',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const scenarioErrors = errors.filter(
        (error) => error.property === 'scenarios',
      );
      expect(scenarioErrors.length).toBeGreaterThan(0);
      expect(scenarioErrors[0].constraints).toHaveProperty('arrayNotEmpty');
    });
  });

  describe('Test 5: Empty string inside array is rejected', () => {
    it('rejects empty string within scenarios array', async () => {
      // Arrange
      const dto = plainToInstance(VideoPipeRequestDto, {
        scenarios: ['a', ''],
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
      expect(scenarioErrors[0].constraints).not.toHaveProperty('arrayNotEmpty');
    });
  });

  describe('Test 6: aspectRatio validation', () => {
    it('allows aspectRatio to be omitted', async () => {
      // Arrange
      const dto = plainToInstance(VideoPipeRequestDto, {
        scenarios: makeScenarios(2),
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
        scenarios: makeScenarios(2),
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

  describe('Test 7: styleAnchorImageUrl whitelist', () => {
    it('does not have styleAnchorImageUrl as a decorated field', () => {
      // Arrange & Act
      // styleAnchorImageUrl is not declared as a field in the DTO
      const keys = Object.getOwnPropertyNames(VideoPipeRequestDto.prototype);

      // Assert
      expect(keys).not.toContain('styleAnchorImageUrl');
    });
  });
});
