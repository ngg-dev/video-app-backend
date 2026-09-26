import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { XaiService } from '@ai-providers/xai/services/xai.service';
import { StorageService } from '@storage/services/storage.service';
import {
  buildCharacterBlock,
  buildCharacterSheetPrompt,
} from './utils/character-sheet-prompt.util';
import { CHARACTER_IMAGE_KEY_PREFIX } from './constants/character-gallery.constant';
import {
  CHARACTER_SHEET_ASPECT_RATIO,
  CHARACTER_SHEET_RESOLUTION,
} from './constants/character-sheet.constant';
import type {
  CharacterAppearance,
  CharacterSheetStyle,
} from './types/character-appearance.types';

/**
 * Generates a character reference sheet (appearance → prompt → xAI → storage). Kept separate from
 * `CharacterGalleryService`, which owns persistence and style resolution.
 */
@LogMethods()
@Injectable()
export class CharacterImageService {
  constructor(
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
  ) {}

  async generateCharacterSheet(
    appearance: CharacterAppearance,
    { style, styleDescription }: CharacterSheetStyle,
  ): Promise<string> {
    const prompt = buildCharacterSheetPrompt({
      style,
      styleDescription,
      characterBlock: buildCharacterBlock(appearance),
    });
    const image = await this.xaiService.generateImage({
      prompt,
      aspectRatio: CHARACTER_SHEET_ASPECT_RATIO,
      resolution: CHARACTER_SHEET_RESOLUTION,
    });

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
