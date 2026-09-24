import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';

export type SceneReferenceRole =
  'character' | 'location' | 'styleAnchor' | 'previousScene';

export interface SceneReference {
  role: SceneReferenceRole;
  url: string;
  name?: string;
}

export interface SceneReferenceSelection {
  references: SceneReference[];
  dropped: SceneReference[];
}

export interface BuildSceneReferencesParams {
  characters: CharacterItemEntity[];
  locationImageUrl?: string | null;
  styleAnchorImageUrl?: string | null;
  previousSceneImageUrl?: string | null;
}
