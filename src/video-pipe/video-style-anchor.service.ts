import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { XaiService } from '@ai-providers/xai/services/xai.service';
import { CharacterCollectionItemEntity } from 'src/character-gallery/entities/character-item.entity';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { StorageService } from '@storage/services/storage.service';
import { VIDEO_STYLE_ANCHOR_KEY_PREFIX } from './constants/video-pipe.constant';
import { buildVideoStyleAnchorPrompt } from './utils/video-style-anchor-prompt.util';

/**
 * Generates the video style anchor: a group shot of the characters used as the
 * main style reference for every scene of one video-pipe run.
 */
@LogMethods()
@Injectable()
export class VideoStyleAnchorService {
  constructor(
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Must be called only with a non-empty `referenceImages` list.
   * Returns the uploaded anchor image URL.
   */
  async generateStyleAnchor(
    collection: Pick<CharacterCollectionItemEntity, 'styleDescription'> & {
      style: string;
    },
    referenceImages: string[],
  ): Promise<string> {
    const image = await this.xaiService.generateImage({
      prompt: buildVideoStyleAnchorPrompt(
        collection.style,
        collection.styleDescription ?? null,
      ),
      referenceImages,
    });

    if (!image) {
      throw new InternalServerErrorException(
        'Video style anchor generation failed.',
      );
    }

    const { url } = await this.storageService.uploadGeneratedFile(
      image,
      VIDEO_STYLE_ANCHOR_KEY_PREFIX,
    );

    return url;
  }
}
