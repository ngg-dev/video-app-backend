import { buildScenarioPlanRosterHint } from './scenario-plan.constant';
import type { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';

describe('buildScenarioPlanRosterHint', () => {
  it('outputs character name and ageAndGender separated by em-dash', () => {
    // Arrange
    const character: CharacterItemEntity = {
      id: 'char1',
      name: 'Аня',
      appearance: {
        ageAndGender: 'AGE_GENDER',
        face: 'FACE',
        hair: 'HAIR',
        build: 'BUILD',
        outfit: 'OUTFIT',
        footwear: 'FOOTWEAR',
        accessories: 'ACCESSORIES',
        palette: 'PALETTE',
      },
      style: null,
      collectionId: null,
      imageUrl: 'https://example.com/anya.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act
    const result = buildScenarioPlanRosterHint([character]);

    // Assert
    expect(result).toContain('Аня — AGE_GENDER');
    expect(result).not.toContain('FACE');
    expect(result).not.toContain('HAIR');
    expect(result).not.toContain('BUILD');
    expect(result).not.toContain('OUTFIT');
    expect(result).not.toContain('FOOTWEAR');
    expect(result).not.toContain('ACCESSORIES');
    expect(result).not.toContain('PALETTE');
  });
});
