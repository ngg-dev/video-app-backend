import { isNotNullOrUndefined } from 'src/shared/utils';
import {
  SCENE_CHARACTER_SHEET_FRAME_NOTE,
  buildSceneCharacterReferenceLine,
  buildSceneLocationReferenceLine,
  buildScenePreviousSceneReferenceLine,
  buildSceneStyleAnchorReferenceLine,
} from '../constants/scene-prompt.constant';
import {
  SCENE_REFERENCE_LIMIT,
  SCENE_REFERENCE_ROLE_PRIORITY,
} from '../constants/scene-reference.constant';
import {
  BuildSceneReferencesParams,
  SceneReference,
  SceneReferenceSelection,
} from '../types/scene-reference.types';

function hasUrl(url: string | null | undefined): url is string {
  return isNotNullOrUndefined(url) && url !== '';
}

/**
 * Builds the ordered list of scene image references in canonical order:
 * characters, location, style anchor, previous scene. Empty URLs are dropped.
 * The limit is not applied here.
 */
export function buildSceneReferences({
  characters,
  locationImageUrl,
  styleAnchorImageUrl,
  previousSceneImageUrl,
}: BuildSceneReferencesParams): SceneReference[] {
  const references: SceneReference[] = [];

  for (const { name, imageUrl } of characters) {
    if (hasUrl(imageUrl)) {
      references.push({ role: 'character', url: imageUrl, name });
    }
  }

  if (hasUrl(locationImageUrl)) {
    references.push({ role: 'location', url: locationImageUrl });
  }

  if (hasUrl(styleAnchorImageUrl)) {
    references.push({ role: 'styleAnchor', url: styleAnchorImageUrl });
  }

  if (hasUrl(previousSceneImageUrl)) {
    references.push({ role: 'previousScene', url: previousSceneImageUrl });
  }

  return references;
}

/**
 * Keeps at most `limit` references by role priority (stable within a role);
 * the rest go to `dropped`.
 */
export function limitSceneReferences(
  references: SceneReference[],
  limit: number = SCENE_REFERENCE_LIMIT,
): SceneReferenceSelection {
  const sorted = references
    .map((reference, index) => ({ reference, index }))
    .sort(
      (a, b) =>
        SCENE_REFERENCE_ROLE_PRIORITY.indexOf(a.reference.role) -
          SCENE_REFERENCE_ROLE_PRIORITY.indexOf(b.reference.role) ||
        a.index - b.index,
    )
    .map(({ reference }) => reference);

  return {
    references: sorted.slice(0, limit),
    dropped: sorted.slice(limit),
  };
}

function buildReferenceLine(
  { role, name }: SceneReference,
  position: number,
): string {
  switch (role) {
    case 'character':
      return buildSceneCharacterReferenceLine(position, name);
    case 'location':
      return buildSceneLocationReferenceLine(position);
    case 'styleAnchor':
      return buildSceneStyleAnchorReferenceLine(position);
    case 'previousScene':
      return buildScenePreviousSceneReferenceLine(position);
  }
}

/** Numbered reference block: `Image N` equals the 1-based position of the URL. */
export function buildSceneReferenceBlock(references: SceneReference[]): string {
  if (references.length === 0) {
    return '';
  }

  const lines = references.map((reference, index) =>
    buildReferenceLine(reference, index + 1),
  );

  if (references.some(({ role }) => role === 'character')) {
    lines.push(SCENE_CHARACTER_SHEET_FRAME_NOTE);
  }

  return lines.join('\n');
}
