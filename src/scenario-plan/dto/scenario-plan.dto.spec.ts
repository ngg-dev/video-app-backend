import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  MAX_SCENE_COUNT,
  MIN_SCENE_COUNT,
} from 'src/shared/constants/scene-count';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import { GenerateScenarioPlanRequestDto } from './scenario-plan.dto';

describe('GenerateScenarioPlanRequestDto validation', () => {
  describe('sceneCount validation', () => {
    it('requires sceneCount field', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: 'A cat and a dog meet in a park',
        collectionId: 'c-1',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const sceneCountErrors = errors.filter(
        (error) => error.property === 'sceneCount',
      );
      expect(sceneCountErrors.length).toBeGreaterThan(0);
      expect(sceneCountErrors.some((e) => e.constraints?.isInt)).toBeTruthy();
    });

    it('rejects sceneCount below MIN_SCENE_COUNT', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: 'A cat and a dog meet in a park',
        collectionId: 'c-1',
        sceneCount: MIN_SCENE_COUNT - 1,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const sceneCountErrors = errors.filter(
        (error) => error.property === 'sceneCount',
      );
      expect(sceneCountErrors.length).toBeGreaterThan(0);
      expect(sceneCountErrors.some((e) => e.constraints?.min)).toBeTruthy();
    });

    it('rejects sceneCount above MAX_SCENE_COUNT', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: 'A cat and a dog meet in a park',
        collectionId: 'c-1',
        sceneCount: MAX_SCENE_COUNT + 1,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const sceneCountErrors = errors.filter(
        (error) => error.property === 'sceneCount',
      );
      expect(sceneCountErrors.length).toBeGreaterThan(0);
      expect(sceneCountErrors.some((e) => e.constraints?.max)).toBeTruthy();
    });
  });

  describe('idea validation', () => {
    it('rejects empty idea', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: '',
        collectionId: 'c-1',
        sceneCount: 3,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const ideaErrors = errors.filter((error) => error.property === 'idea');
      expect(ideaErrors.length).toBeGreaterThan(0);
      expect(ideaErrors.some((e) => e.constraints?.isNotEmpty)).toBeTruthy();
    });
  });

  describe('collectionId validation', () => {
    it('rejects empty collectionId', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: 'A cat and a dog meet in a park',
        collectionId: '',
        sceneCount: 3,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const collectionIdErrors = errors.filter(
        (error) => error.property === 'collectionId',
      );
      expect(collectionIdErrors.length).toBeGreaterThan(0);
      expect(
        collectionIdErrors.some((e) => e.constraints?.isNotEmpty),
      ).toBeTruthy();
    });
  });

  describe('aspectRatio validation', () => {
    it('rejects invalid aspectRatio', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: 'A cat and a dog meet in a park',
        collectionId: 'c-1',
        sceneCount: 3,
        aspectRatio: '4:3',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const aspectRatioErrors = errors.filter(
        (error) => error.property === 'aspectRatio',
      );
      expect(aspectRatioErrors.length).toBeGreaterThan(0);
      expect(aspectRatioErrors.some((e) => e.constraints?.isEnum)).toBeTruthy();
    });

    it('allows aspectRatio to be omitted', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: 'A cat and a dog meet in a park',
        collectionId: 'c-1',
        sceneCount: 3,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.aspectRatio).toBeUndefined();
    });

    it('accepts valid aspectRatio', async () => {
      // Arrange
      const dto = plainToInstance(GenerateScenarioPlanRequestDto, {
        idea: 'A cat and a dog meet in a park',
        collectionId: 'c-1',
        sceneCount: 3,
        aspectRatio: VideoAspectRatio.Vertical,
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.aspectRatio).toBe(VideoAspectRatio.Vertical);
    });
  });
});
