jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('@ai-providers/deepseek/services/deepseek.service', () => ({
  DeepSeekService: jest.fn(),
}));

import { ScenarioPlanController } from './scenario-plan.controller';
import { ScenarioPlanService } from './scenario-plan.service';
import {
  GenerateScenarioPlanRequestDto,
  ScenarioPlanResponseDto,
} from './dto/scenario-plan.dto';
import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';

describe('ScenarioPlanController', () => {
  let controller: ScenarioPlanController;
  let serviceMock: { generateScenarioPlan: jest.Mock };

  beforeEach(() => {
    serviceMock = {
      generateScenarioPlan: jest.fn(),
    };

    controller = new ScenarioPlanController(
      serviceMock as unknown as ScenarioPlanService,
    );
  });

  it('delegates to service without own logic', async () => {
    // Arrange
    const dto = new GenerateScenarioPlanRequestDto();
    dto.idea = 'A detective story';
    dto.collectionId = 'c-1';
    dto.sceneCount = 3;
    dto.aspectRatio = VideoAspectRatio.Vertical;

    const expectedResponse: ScenarioPlanResponseDto = {
      scenarios: ['Scene 1', 'Scene 2', 'Scene 3'],
      collectionId: 'c-1',
      aspectRatio: VideoAspectRatio.Vertical,
      scenes: [
        { speakers: ['Аня'], text: 'Scene 1' },
        { speakers: ['Борис'], text: 'Scene 2' },
        { speakers: ['Аня', 'Борис'], text: 'Scene 3' },
      ],
    };

    serviceMock.generateScenarioPlan.mockResolvedValue(expectedResponse);

    // Act
    const result = await controller.generate(dto);

    // Assert
    expect(serviceMock.generateScenarioPlan).toHaveBeenCalledTimes(1);
    expect(serviceMock.generateScenarioPlan).toHaveBeenCalledWith(dto);
    expect(result).toBe(expectedResponse);
  });
});
