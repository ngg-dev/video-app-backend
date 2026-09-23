import { Injectable } from '@nestjs/common';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { CreateVideoService } from 'src/create-video/create-video.service';
import { CreateVideoCacheService } from 'src/create-video/create-video-cache.service';
import {
  CreateRequestDto,
  CreateVideoResponseDto,
} from 'src/create-video/dto/create-video.dto';
import { PreparedSceneImage } from 'src/create-video/types/create-video.types';
import { VideoAssemblyService } from 'src/media/video-assembly.service';
import { CharacterCollectionReaderService } from 'src/character-gallery/character-collection-reader.service';
import { CollectionStyleAnchorService } from 'src/character-gallery/collection-style-anchor.service';
import {
  DEFAULT_VIDEO_ASPECT_RATIO,
  VIDEO_ASPECT_RATIO_DIMENSIONS,
} from 'src/shared/constants/video-aspect-ratio';
import { DEFAULT_VIDEO_DURATION_SECONDS } from 'src/shared/constants/video-duration';
import { VIDEO_PIPE_RESULT_KEY_PREFIX } from './constants/video-pipe.constant';
import {
  VideoPipeRequestDto,
  VideoPipeResponseDto,
} from './dto/video-pipe.dto';
import { runSceneImageChain } from './utils/scene-chain.util';

@LogMethods()
@Injectable()
export class VideoPipeService {
  constructor(
    private readonly createVideoService: CreateVideoService,
    private readonly videoAssemblyService: VideoAssemblyService,
    private readonly createVideoCacheService: CreateVideoCacheService,
    private readonly characterCollectionReaderService: CharacterCollectionReaderService,
    private readonly collectionStyleAnchorService: CollectionStyleAnchorService,
  ) {}

  async createVideoPipeline(
    data: VideoPipeRequestDto,
  ): Promise<VideoPipeResponseDto> {
    const { scenarios, collectionId } = data;
    const aspectRatio = data.aspectRatio ?? DEFAULT_VIDEO_ASPECT_RATIO;

    const { collection, characters } =
      await this.characterCollectionReaderService.loadCollectionWithCharacters(
        collectionId,
      );

    const styleAnchorImageUrl =
      await this.collectionStyleAnchorService.ensureStyleAnchor(
        collection,
        characters,
      );

    const scenes = await runSceneImageChain<
      PreparedSceneImage,
      CreateVideoResponseDto
    >(
      scenarios.length,
      (index, previous) => {
        const sceneRequest: CreateRequestDto = {
          scenario: scenarios[index],
          collectionId,
          aspectRatio,
          duration: DEFAULT_VIDEO_DURATION_SECONDS,
          collection: { ...collection, styleAnchorImageUrl },
          characters,
          styleReferenceImageUrl: previous?.sceneImageUrl,
        };

        return this.createVideoService.prepareSceneImage(sceneRequest);
      },
      (prepared) => this.createVideoService.renderSceneVideo(prepared),
    );

    const partUrls = scenes.map((scene) => scene.sceneVideoUrl);
    const { url } = await this.videoAssemblyService.concatNormalizedAndGetUrl(
      partUrls,
      {
        size: VIDEO_ASPECT_RATIO_DIMENSIONS[aspectRatio],
        keyPrefix: VIDEO_PIPE_RESULT_KEY_PREFIX,
      },
    );

    await this.createVideoCacheService.delMany(scenarios, collectionId);

    return { videoUrl: url };
  }
}
