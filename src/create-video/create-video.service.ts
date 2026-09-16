import { randomUUID } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GeneratedFile } from 'ai';
import { CreateRequestDto } from './dto/create-video.dto';
import { DeepSeekService } from 'src/ai-providers/deepseek/deepseek.service';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { StorageService } from 'src/storage/storage.service';
import { SCENE_IMAGE_PROMPT_INSTRUCTIONS } from './constants/scene-prompt.constant';
import { Repository } from 'typeorm';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from 'src/character-gallery/entities/character-item.entity';

@Injectable()
export class CreateVideoService {
  constructor(
    private readonly deepSeekService: DeepSeekService,
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
    @InjectRepository(CharacterCollectionItemEntity)
    private readonly characterСollectiorItemRepository: Repository<CharacterCollectionItemEntity>,
    @InjectRepository(CharacterItemEntity)
    private readonly characterItemRepository: Repository<CharacterItemEntity>,
  ) {}

  async createVideoPipe(data: CreateRequestDto): Promise<string> {
    const scenario = data?.scenario.toLowerCase();
    const collectionId = data?.collectionId;

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

    return this.uploadSceneImage(sceneImage);
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

  private async uploadSceneImage(image: GeneratedFile): Promise<string> {
    const extension = image.mediaType?.split('/')[1] ?? 'png';
    const key = `scenes/${Date.now()}-${randomUUID()}.${extension}`;
    const { url } = await this.storageService.upload(
      key,
      Buffer.from(image.uint8Array),
      image.mediaType,
    );

    return url;
  }
}
