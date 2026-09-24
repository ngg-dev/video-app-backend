import { VideoAspectRatio } from 'src/shared/constants/video-aspect-ratio';
import { SceneReference } from './scene-reference.types';

export interface PreparedSceneImage {
  scenario: string;
  collectionId: string;
  duration: number;
  characterNames: string[];
  sceneImageUrl: string;
  cachedSceneVideoUrl?: string;
}

export interface BuildScenePromptParams {
  scenario: string;
  characterNames: string[];
  collectionStyle: string | null;
  styleDescription: string | null;
  aspectRatio: VideoAspectRatio;
  references: SceneReference[];
}
