import { randomUUID } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GeneratedFile } from 'ai';
import {
  CreateRequestDto,
  CreateVideoResponseDto,
} from './dto/create-video.dto';
import { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { StorageService } from 'src/storage/storage.service';
import {
  SCENE_IMAGE_PROMPT_INSTRUCTIONS,
  SCENE_VIDEO_PROMPT_INSTRUCTIONS,
} from './constants/scene-prompt.constant';
import { Repository } from 'typeorm';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';
import { CreateVideoCacheService } from './create-video-cache.service';

@Injectable()
export class CreateVideoService {
  constructor(
    private readonly deepSeekService: DeepSeekService,
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
    private readonly createVideoCacheService: CreateVideoCacheService,
    @InjectRepository(CharacterCollectionItemEntity)
    private readonly characterСollectiorItemRepository: Repository<CharacterCollectionItemEntity>,
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
  ) {}

  async createVideoPipe(
    data: CreateRequestDto,
  ): Promise<CreateVideoResponseDto> {
    const scenario = data?.scenario.toLowerCase();
    const collectionId = data?.collectionId;

    const cached = await this.createVideoCacheService.get(
      scenario,
      collectionId,
    );

    if (cached) {
      return cached;
    }

    const [collection, collectionCharacters] = await Promise.all([
      this.characterСollectiorItemRepository.findOne({
        where: { id: collectionId },
      }),
      this.characterItemRepository.find({
        where: {
          collectionId: collectionId,
        },
      }),
    ]);

    const collectionPersons = collectionCharacters.filter(({ name }) =>
      scenario.includes(name.toLowerCase()),
    );
    const referenceImages = collectionPersons.map((el) => el.imageUrl || '');

    const scenePrompt = await this.buildScenePrompt(
      scenario,
      collectionPersons.map(({ name }) => name),
      collection?.style ?? null,
    );

    const sceneImage = await this.xaiService.generateImage({
      prompt: scenePrompt,
      referenceImages,
    });

    if (!sceneImage) {
      throw new InternalServerErrorException('Scene image generation failed.');
    }

    const sceneImageUrl = await this.uploadGeneratedFile(
      sceneImage,
      'scenes',
      'png',
    );

    const videoPrompt = await this.buildVideoPrompt(
      scenario,
      collectionPersons.map(({ name }) => name),
    );

    const sceneVideo = await this.xaiService.generateVideo({
      prompt: videoPrompt,
      referenceImageUrls: [sceneImageUrl],
      resolution: '720p',
    });

    if (!sceneVideo?.videoUrl) {
      throw new InternalServerErrorException('Scene video generation failed.');
    }

    const sceneVideoUrl = sceneVideo.videoUrl;
    const result = { sceneImageUrl, sceneVideoUrl };

    await this.createVideoCacheService.set(scenario, collectionId, result);

    return result;
  }

  private async buildScenePrompt(
    scenario: string,
    characterNames: string[],
    collectionStyle: string | null,
  ): Promise<string> {
    const charactersHint = characterNames.length
      ? `Characters present in the scene (keep their appearance consistent with the reference images): ${characterNames.join(', ')}.`
      : '';
    const styleHint = collectionStyle
      ? `Render the image in the following visual style: ${collectionStyle}.`
      : '';

    const instruction = [
      ...SCENE_IMAGE_PROMPT_INSTRUCTIONS,
      charactersHint,
      styleHint,
      '',
      `Scene: ${scenario}`,
    ]
      .filter(Boolean)
      .join('\n');

    const generatedPrompt = await this.deepSeekService.generate({
      prompt: instruction,
    });

    return generatedPrompt || scenario;
  }

  private async buildVideoPrompt(
    scenario: string,
    characterNames: string[],
  ): Promise<string> {
    const charactersHint = characterNames.length
      ? `Characters present in the scene (keep their appearance unchanged): ${characterNames.join(', ')}.`
      : '';

    const instruction = [
      ...SCENE_VIDEO_PROMPT_INSTRUCTIONS,
      charactersHint,
      '',
      `Scene: ${scenario}`,
    ]
      .filter(Boolean)
      .join('\n');

    const generatedPrompt = await this.deepSeekService.generate({
      prompt: instruction,
    });

    return generatedPrompt || `<IMAGE_1> comes to life: ${scenario}`;
  }

  private async uploadGeneratedFile(
    file: GeneratedFile,
    prefix: string,
    fallbackExtension: string,
  ): Promise<string> {
    const extension = file.mediaType?.split('/')[1] ?? fallbackExtension;
    const key = `${prefix}/${Date.now()}-${randomUUID()}.${extension}`;
    const { url } = await this.storageService.upload(
      key,
      Buffer.from(file.uint8Array),
      file.mediaType,
    );

    return url;
  }
}
