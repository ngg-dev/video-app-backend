import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { XaiService } from 'src/ai-providers/xai/xai.service';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';
import { isNotNullOrUndefined } from 'src/shared/utils';
import { StorageService } from 'src/storage/storage.service';
import { COLLECTION_STYLE_ANCHOR_KEY_PREFIX } from './constants/character-gallery.constant';
import {
  CharacterCollectionItemEntity,
  CharacterItemEntity,
} from './entities/character-item.entity';
import { buildCollectionStyleAnchorPrompt } from './utils/collection-style-anchor-prompt.util';

/**
 * Lazily creates and persists the collection style anchor: a group shot of the
 * collection's characters used as the main style reference for every scene.
 */
@LogMethods()
@Injectable()
export class CollectionStyleAnchorService {
  constructor(
    @InjectRepository(CharacterCollectionItemEntity)
    private readonly characterCollectionItemRepository: Repository<CharacterCollectionItemEntity>,
    private readonly xaiService: XaiService,
    private readonly storageService: StorageService,
  ) {}

  async ensureStyleAnchor(
    collection: CharacterCollectionItemEntity & { style: string },
    characters: CharacterItemEntity[],
  ): Promise<string | null> {
    if (
      isNotNullOrUndefined(collection.styleAnchorImageUrl) &&
      collection.styleAnchorImageUrl !== ''
    ) {
      return collection.styleAnchorImageUrl;
    }

    const referenceImages = characters
      .map(({ imageUrl }) => imageUrl)
      .filter(
        (imageUrl): imageUrl is string =>
          isNotNullOrUndefined(imageUrl) && imageUrl !== '',
      );

    if (referenceImages.length === 0) {
      return null;
    }

    const image = await this.xaiService.generateImage({
      prompt: buildCollectionStyleAnchorPrompt(
        collection.style,
        collection.styleDescription ?? null,
      ),
      referenceImages,
    });

    if (!image) {
      throw new InternalServerErrorException(
        'Collection style anchor generation failed.',
      );
    }

    const { url } = await this.storageService.uploadGeneratedFile(
      image,
      COLLECTION_STYLE_ANCHOR_KEY_PREFIX,
    );

    const { affected } = await this.characterCollectionItemRepository.update(
      { id: collection.id, styleAnchorImageUrl: IsNull() },
      { styleAnchorImageUrl: url },
    );

    if (isNotNullOrUndefined(affected) && affected > 0) {
      return url;
    }

    const reloaded = await this.characterCollectionItemRepository.findOne({
      where: { id: collection.id },
    });

    if (
      !isNotNullOrUndefined(reloaded) ||
      !isNotNullOrUndefined(reloaded.styleAnchorImageUrl) ||
      reloaded.styleAnchorImageUrl === ''
    ) {
      throw new InternalServerErrorException(
        'Collection style anchor could not be resolved.',
      );
    }

    return reloaded.styleAnchorImageUrl;
  }
}
