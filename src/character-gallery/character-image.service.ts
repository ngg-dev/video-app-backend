import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { StorageService } from 'src/storage/storage.service';
import { buildCharacterTurnaroundPrompt } from './utils/character-image-prompt.util';
import { CHARACTER_IMAGE_KEY_PREFIX } from './constants/character-gallery.constant';

/**
 * Generates a character turnaround image (prompt → xAI → storage). Kept separate from
 * `CharacterGalleryService`, which owns persistence and style resolution.
 */
@LogMethods()
@Injectable()
export class CharacterImageService {
  constructor(
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
  ) {}

  async generateCharacterImage(
    prompt: string,
    style: string | null,
  ): Promise<string> {
    const imagePrompt = buildCharacterTurnaroundPrompt(prompt, style);
    const image = await this.xaiService.generateImage({ prompt: imagePrompt });

    if (!image) {
      throw new InternalServerErrorException(
        'Character image generation failed.',
      );
    }

    const { url } = await this.storageService.uploadGeneratedFile(
      image,
      CHARACTER_IMAGE_KEY_PREFIX,
    );

    return url;
  }
}
