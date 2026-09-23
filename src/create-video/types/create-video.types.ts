export interface PreparedSceneImage {
  scenario: string;
  collectionId: string;
  duration: number;
  characterNames: string[];
  sceneImageUrl: string;
  cachedSceneVideoUrl?: string;
}
