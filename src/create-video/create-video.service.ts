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
import {
  buildSceneReferenceImages,
  selectCharacterReferenceImages,
} from './utils/scene-reference-images.util';
import { DEFAULT_VIDEO_ASPECT_RATIO } from 'src/shared/constants/video-aspect-ratio';
import { DEFAULT_VIDEO_DURATION_SECONDS } from 'src/shared/constants/video-duration';
import { isNotNullOrUndefined, isNotUndefined } from 'src/shared/utils';
import { PreparedSceneImage } from './types/create-video.types';

@Injectable()
export class CreateVideoService {
  constructor(
    private readonly createVideoPromptService: CreateVideoPromptService,
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
    private readonly createVideoCacheService: CreateVideoCacheService,
    private readonly characterCollectionReaderService: CharacterCollectionReaderService,
  ) {}

  async prepareSceneImage(data: CreateRequestDto): Promise<PreparedSceneImage> {
    const scenario = normalizeScenario(data.scenario);
    const collectionId = data?.collectionId;
    const aspectRatio = data?.aspectRatio ?? DEFAULT_VIDEO_ASPECT_RATIO;
    const duration = data?.duration ?? DEFAULT_VIDEO_DURATION_SECONDS;

    const cached = await this.createVideoCacheService.get(
      scenario,
      collectionId,
    );

    if (cached) {
      return {
        scenario,
        collectionId,
        duration,
        characterNames: [],
        sceneImageUrl: cached.sceneImageUrl,
        cachedSceneVideoUrl: cached.sceneVideoUrl,
      };
    }

    let collection = data.collection;
    let collectionCharacters = data.characters;

    if (isNotUndefined(collection) && isNotUndefined(collectionCharacters)) {
      assertCollectionHasStyle(collection);
    } else {
      const loaded =
        await this.characterCollectionReaderService.loadCollectionWithCharacters(
          collectionId,
        );
      collection = loaded.collection;
      collectionCharacters = loaded.characters;
    }

    const styleAnchorImageUrl =
      isNotNullOrUndefined(data.styleAnchorImageUrl) &&
      data.styleAnchorImageUrl !== ''
        ? data.styleAnchorImageUrl
        : undefined;

    const { persons: collectionPersons, referenceImages } =
      selectMentionedCharacters(scenario, collectionCharacters);
    const characterReferenceImages =
      selectCharacterReferenceImages(referenceImages);

    const scenePrompt = await this.createVideoPromptService.buildScenePrompt({
      scenario,
      characterNames: collectionPersons.map(({ name }) => name),
      collectionStyle: collection.style,
      styleDescription: collection.styleDescription ?? null,
      aspectRatio,
      characterReferenceCount: characterReferenceImages.length,
      hasStyleAnchor: isNotUndefined(styleAnchorImageUrl),
      hasPreviousScene: isNotUndefined(data.styleReferenceImageUrl),
    });

    const sceneImage = await this.xaiService.generateImage({
      prompt: scenePrompt,
      referenceImages: buildSceneReferenceImages({
        characterReferenceImages,
        styleAnchorImageUrl,
        previousSceneImageUrl: data.styleReferenceImageUrl,
      }),
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

    return {
      scenario,
      collectionId,
      duration,
      characterNames: collectionPersons.map(({ name }) => name),
      sceneImageUrl,
    };
  }

  async renderSceneVideo(
    prepared: PreparedSceneImage,
  ): Promise<CreateVideoResponseDto> {
    const { scenario, collectionId, duration, sceneImageUrl } = prepared;

    if (isNotUndefined(prepared.cachedSceneVideoUrl)) {
      return {
        sceneImageUrl,
        sceneVideoUrl: prepared.cachedSceneVideoUrl,
      };
    }

    const videoPrompt = await this.createVideoPromptService.buildVideoPrompt(
      scenario,
      prepared.characterNames,
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

  async createVideoPipe(
    data: CreateRequestDto,
  ): Promise<CreateVideoResponseDto> {
    return this.renderSceneVideo(await this.prepareSceneImage(data));
  }
}
