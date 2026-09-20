import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { CreateVideoService } from 'src/create-video/create-video.service';
import { CreateRequestDto } from 'src/create-video/dto/create-video.dto';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';
import { assertCollectionHasStyle } from 'src/character-gallery/utils/character-collection.util';
import { DEFAULT_VIDEO_ASPECT_RATIO } from 'src/shared/constants/video-aspect-ratio';
import { DEFAULT_VIDEO_DURATION_SECONDS } from 'src/shared/constants/video-duration';
import {
  VideoPipeRequestDto,
  VideoPipeResponseDto,
} from './dto/video-pipe.dto';

@LogMethods()
@Injectable()
export class VideoPipeService {
  constructor(
    private readonly createVideoService: CreateVideoService,
    @InjectRepository(CharacterCollectionItemEntity)
    private readonly characterCollectionItemRepository: Repository<CharacterCollectionItemEntity>,
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
  ) {}

  async createVideoPipeline(
    data: VideoPipeRequestDto,
  ): Promise<VideoPipeResponseDto> {
    const { scenarios, collectionId } = data;
    const aspectRatio = data.aspectRatio ?? DEFAULT_VIDEO_ASPECT_RATIO;

    const [collection, characters] = await Promise.all([
      this.characterCollectionItemRepository.findOne({
        where: { id: collectionId },
      }),
      this.characterItemRepository.find({
        where: { collectionId },
      }),
    ]);

    assertCollectionHasStyle(collection);

    return Promise.all(
      scenarios.map((scenario) => {
        const sceneRequest: CreateRequestDto = {
          scenario,
          collectionId,
          aspectRatio,
          duration: DEFAULT_VIDEO_DURATION_SECONDS,
          collection,
          characters,
        };

        return this.createVideoService.createVideoPipe(sceneRequest);
      }),
    );
  }
}
