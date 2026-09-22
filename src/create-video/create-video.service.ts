import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  CreateRequestDto,
  CreateVideoResponseDto,
} from './dto/create-video.dto';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { StorageService } from 'src/storage/storage.service';
import { CharacterCollectionReaderService } from 'src/character-gallery/character-collection-reader.service';
import {
  assertCollectionHasStyle,
  selectMentionedCharacters,
} from 'src/character-gallery/utils/character-collection.util';
import { CreateVideoCacheService } from './create-video-cache.service';
import { CreateVideoPromptService } from './create-video-prompt.service';
import { normalizeScenario } from './utils/scenario.util';
import { DEFAULT_VIDEO_ASPECT_RATIO } from 'src/shared/constants/video-aspect-ratio';
import { DEFAULT_VIDEO_DURATION_SECONDS } from 'src/shared/constants/video-duration';
import { isNotUndefined } from 'src/shared/utils';

@Injectable()
export class CreateVideoService {
  constructor(
    private readonly createVideoPromptService: CreateVideoPromptService,
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
    private readonly createVideoCacheService: CreateVideoCacheService,
    private readonly characterCollectionReaderService: CharacterCollectionReaderService,
  ) {}

  async createVideoPipe(
    data: CreateRequestDto,
  ): Promise<CreateVideoResponseDto> {
    const scenario = normalizeScenario(data.scenario);
    const collectionId = data?.collectionId;
    const aspectRatio = data?.aspectRatio ?? DEFAULT_VIDEO_ASPECT_RATIO;
    const duration = data?.duration ?? DEFAULT_VIDEO_DURATION_SECONDS;

    const cached = await this.createVideoCacheService.get(
      scenario,
      collectionId,
    );

    if (cached) {
      return cached;
    }

    let collection = data.collection;
    let collectionCharacters = data.characters;

    if (isNotUndefined(collection) && isNotUndefined(collectionCharacters)) {
      assertCollectionHasStyle(collection);
    } else {
      ({ collection, characters: collectionCharacters } =
        await this.characterCollectionReaderService.loadCollectionWithCharacters(
          collectionId,
        ));
    }

    const { persons: collectionPersons, referenceImages } =
      selectMentionedCharacters(scenario, collectionCharacters);

    const scenePrompt = await this.createVideoPromptService.buildScenePrompt(
      scenario,
      collectionPersons.map(({ name }) => name),
      collection.style,
      aspectRatio,
    );

    const sceneImage = await this.xaiService.generateImage({
      prompt: scenePrompt,
      referenceImages,
      aspectRatio,
    });

    if (!sceneImage) {
      throw new InternalServerErrorException('Scene image generation failed.');
    }

    const { url: sceneImageUrl } =
      await this.storageService.uploadGeneratedFile(
        sceneImage,
        'scenes',
        'png',
      );

    const videoPrompt = await this.createVideoPromptService.buildVideoPrompt(
      scenario,
      collectionPersons.map(({ name }) => name),
    );

    const sceneVideo = await this.xaiService.generateVideo({
      prompt: videoPrompt,
      referenceImageUrls: [sceneImageUrl],
      resolution: '720p',
      duration,
    });

    if (!sceneVideo?.videoUrl) {
      throw new InternalServerErrorException('Scene video generation failed.');
    }

    const sceneVideoUrl = sceneVideo.videoUrl;
    const result = { sceneImageUrl, sceneVideoUrl };

    await this.createVideoCacheService.set(scenario, collectionId, result);

    return result;
  }
}
