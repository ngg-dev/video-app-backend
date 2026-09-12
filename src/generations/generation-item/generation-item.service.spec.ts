import { Test, TestingModule } from '@nestjs/testing';
import { GenerationItemService } from './generation-item.service';

describe('GenerationItemService', () => {
  let service: GenerationItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GenerationItemService],
    }).compile();

    service = module.get<GenerationItemService>(GenerationItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
