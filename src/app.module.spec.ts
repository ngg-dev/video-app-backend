import { readFileSync } from 'fs';
import { join } from 'path';

describe('AppModule generation-item status (branch 11a - deleted)', () => {
  it('does not import GenerationItemModule and imports expected feature modules', () => {
    // Arrange
    const appModulePath = join(__dirname, 'app.module.ts');
    const appModuleContent = readFileSync(appModulePath, 'utf-8');

    // Act & Assert
    // Verify that GenerationItemModule is not imported in AppModule
    expect(appModuleContent).not.toContain('GenerationItemModule');
    expect(appModuleContent).not.toContain(
      'generation-item/generation-item.module',
    );

    // Verify that expected feature modules are imported
    expect(appModuleContent).toContain(
      "import { CreateVideoModule } from './create-video/create-video.module'",
    );
    expect(appModuleContent).toContain(
      "import { CharacterGalleryModule } from './character-gallery/character-gallery.module'",
    );
    expect(appModuleContent).toContain(
      "import { VideoPipeModule } from './video-pipe/video-pipe.module'",
    );
    expect(appModuleContent).toContain(
      "import { MediaModule } from './media/media.module'",
    );
    expect(appModuleContent).toContain(
      "import { StorageModule } from './storage/storage.module'",
    );
  });
});
