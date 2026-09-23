import { selectMentionedCharacters } from 'src/character-gallery/utils/character-collection.util';
import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import { normalizeScenario } from 'src/create-video/utils/scenario.util';
import { isNotNullOrUndefined } from 'src/shared/utils';

/**
 * Photos of collection characters mentioned in at least one scenario, in the
 * order of `characters`, one photo per character. Characters without a photo
 * are skipped.
 */
export function selectStyleAnchorReferenceImages(
  scenarios: string[],
  characters: CharacterItemEntity[],
): string[] {
  const normalizedScenarios = scenarios.map(normalizeScenario);

  return characters
    .filter((character) =>
      normalizedScenarios.some(
        (scenario) =>
          selectMentionedCharacters(scenario, [character]).persons.length > 0,
      ),
    )
    .map(({ imageUrl }) => imageUrl)
    .filter(
      (imageUrl): imageUrl is string =>
        isNotNullOrUndefined(imageUrl) && imageUrl !== '',
    );
}
