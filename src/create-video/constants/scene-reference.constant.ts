import { SceneReferenceRole } from '../types/scene-reference.types';

export const SCENE_REFERENCE_LIMIT = 5;

/** Canonical order of references and their priority when the limit is exceeded. */
export const SCENE_REFERENCE_ROLE_PRIORITY: readonly SceneReferenceRole[] = [
  'character',
  'location',
  'styleAnchor',
  'previousScene',
];
