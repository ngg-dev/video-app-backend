import { Test, TestingModule } from '@nestjs/testing';
import { GenerationItemController } from './generation-item.controller';
import { GenerationItemService } from './generation-item.service';

describe('GenerationItemController', () => {
  let controller: GenerationItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationItemController],
      providers: [GenerationItemService],
    }).compile();

    controller = module.get<GenerationItemController>(GenerationItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
