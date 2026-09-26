import { CharacterItemEntity } from 'src/character-gallery/entities/character-item.entity';
import {
  buildSceneReferences,
  limitSceneReferences,
  buildSceneReferenceBlock,
} from './scene-reference.util';
import {
  buildSceneCharacterReferenceLine,
  buildSceneStyleAnchorReferenceLine,
  buildScenePreviousSceneReferenceLine,
  SCENE_CHARACTER_SHEET_FRAME_NOTE,
} from '../constants/scene-prompt.constant';

describe('buildSceneReferences', () => {
  // 1. Canonical order of all roles
  it('builds all roles in canonical order', () => {
    // Arrange
    const characters = [
      { name: 'Anna', imageUrl: 'a.png' },
      { name: 'Bob', imageUrl: 'b.png' },
    ] as CharacterItemEntity[];
    const locationImageUrl = 'loc.png';
    const styleAnchorImageUrl = 'anchor.png';
    const previousSceneImageUrl = 'prev.png';

    // Act
    const result = buildSceneReferences({
      characters,
      locationImageUrl,
      styleAnchorImageUrl,
      previousSceneImageUrl,
    });

    // Assert
    expect(result).toEqual([
      { role: 'character', url: 'a.png', name: 'Anna' },
      { role: 'character', url: 'b.png', name: 'Bob' },
      { role: 'location', url: 'loc.png' },
      { role: 'styleAnchor', url: 'anchor.png' },
      { role: 'previousScene', url: 'prev.png' },
    ]);
  });

  // 2. Character without picture in the middle does not shift names
  it('preserves character names in order even when some lack images', () => {
    // Arrange
    const characters = [
      { name: 'Anna', imageUrl: 'a.png' },
      { name: 'Bob', imageUrl: null },
      { name: 'Cid', imageUrl: 'c.png' },
    ] as CharacterItemEntity[];

    // Act
    const result = buildSceneReferences({
      characters,
    });

    // Assert
    expect(result).toEqual([
      { role: 'character', url: 'a.png', name: 'Anna' },
      { role: 'character', url: 'c.png', name: 'Cid' },
    ]);
  });

  // 3. Empty URLs are dropped for all roles
  it('drops empty URLs for all roles', () => {
    // Arrange
    const characters = [
      { name: 'Test', imageUrl: '' },
    ] as CharacterItemEntity[];

    // Act
    const result = buildSceneReferences({
      characters,
      locationImageUrl: '',
      styleAnchorImageUrl: null,
      previousSceneImageUrl: undefined,
    });

    // Assert
    expect(result).toEqual([]);
  });

  // 4. No input data
  it('returns empty array when no data is provided', () => {
    // Arrange & Act
    const result = buildSceneReferences({
      characters: [],
    });

    // Assert
    expect(result).toEqual([]);
  });
});

describe('limitSceneReferences', () => {
  // 5. Not more than limit
  it('keeps all references when below the limit', () => {
    // Arrange
    const characters = [
      { name: 'Anna', imageUrl: 'a.png' },
      { name: 'Bob', imageUrl: 'b.png' },
    ] as CharacterItemEntity[];
    const references = buildSceneReferences({
      characters,
      styleAnchorImageUrl: 'anchor.png',
      previousSceneImageUrl: 'prev.png',
    });

    // Act
    const result = limitSceneReferences(references);

    // Assert
    expect(result.references).toEqual(references);
    expect(result.dropped).toEqual([]);
  });

  // 6. Exactly 5 references
  it('keeps all 5 references when exactly at the limit', () => {
    // Arrange
    const characters = [
      { name: 'Anna', imageUrl: 'a.png' },
      { name: 'Bob', imageUrl: 'b.png' },
      { name: 'Cid', imageUrl: 'c.png' },
    ] as CharacterItemEntity[];
    const references = buildSceneReferences({
      characters,
      styleAnchorImageUrl: 'anchor.png',
      previousSceneImageUrl: 'prev.png',
    });

    // Act
    const result = limitSceneReferences(references);

    // Assert
    expect(result.references.length).toBe(5);
    expect(result.dropped.length).toBe(0);
  });

  // 7. 6 with location: previousScene is dropped
  it('drops предыдущая сцена when 6 references include location', () => {
    // Arrange
    const characters = [
      { name: 'Anna', imageUrl: 'a.png' },
      { name: 'Bob', imageUrl: 'b.png' },
      { name: 'Cid', imageUrl: 'c.png' },
    ] as CharacterItemEntity[];
    const references = buildSceneReferences({
      characters,
      locationImageUrl: 'loc.png',
      styleAnchorImageUrl: 'anchor.png',
      previousSceneImageUrl: 'prev.png',
    });

    // Act
    const result = limitSceneReferences(references);

    // Assert
    expect(result.references).toEqual([
      { role: 'character', url: 'a.png', name: 'Anna' },
      { role: 'character', url: 'b.png', name: 'Bob' },
      { role: 'character', url: 'c.png', name: 'Cid' },
      { role: 'location', url: 'loc.png' },
      { role: 'styleAnchor', url: 'anchor.png' },
    ]);
    expect(result.dropped).toEqual([
      { role: 'previousScene', url: 'prev.png' },
    ]);
  });

  // 8. Style anchor has priority over предыдущая сцена
  it('drops предыдущая сцена before эталон стиля when both compete', () => {
    // Arrange
    const characters = [
      { name: 'P1', imageUrl: 'p1.png' },
      { name: 'P2', imageUrl: 'p2.png' },
      { name: 'P3', imageUrl: 'p3.png' },
      { name: 'P4', imageUrl: 'p4.png' },
    ] as CharacterItemEntity[];
    const references = buildSceneReferences({
      characters,
      styleAnchorImageUrl: 'anchor.png',
      previousSceneImageUrl: 'prev.png',
    });

    // Act
    const result = limitSceneReferences(references);

    // Assert
    expect(result.references.length).toBe(5);
    expect(result.dropped).toEqual([
      { role: 'previousScene', url: 'prev.png' },
    ]);
    expect(result.references.some((r) => r.role === 'styleAnchor')).toBe(true);
  });

  // 9. 6+ characters displace everything else
  it('drops non-character references when there are 6+ characters', () => {
    // Arrange
    const characters = [
      { name: 'P1', imageUrl: 'p1.png' },
      { name: 'P2', imageUrl: 'p2.png' },
      { name: 'P3', imageUrl: 'p3.png' },
      { name: 'P4', imageUrl: 'p4.png' },
      { name: 'P5', imageUrl: 'p5.png' },
      { name: 'P6', imageUrl: 'p6.png' },
    ] as CharacterItemEntity[];
    const references = buildSceneReferences({
      characters,
      styleAnchorImageUrl: 'anchor.png',
      previousSceneImageUrl: 'prev.png',
    });

    // Act
    const result = limitSceneReferences(references);

    // Assert
    expect(result.references.length).toBe(5);
    expect(result.references.filter((r) => r.role === 'character').length).toBe(
      5,
    );
    expect(result.dropped.length).toBe(3);
    expect(result.dropped.map((d) => d.role)).toContain('previousScene');
    expect(result.dropped.map((d) => d.role)).toContain('styleAnchor');
  });

  // 10. Result in canonical order when input is mixed
  it('returns references in canonical order when input is mixed', () => {
    // Arrange
    const references = [
      { role: 'previousScene' as const, url: 'prev.png' },
      { role: 'character' as const, url: 'a.png', name: 'Anna' },
      { role: 'styleAnchor' as const, url: 'anchor.png' },
      { role: 'character' as const, url: 'b.png', name: 'Bob' },
    ];

    // Act
    const result = limitSceneReferences(references);

    // Assert
    expect(result.references).toEqual([
      { role: 'character', url: 'a.png', name: 'Anna' },
      { role: 'character', url: 'b.png', name: 'Bob' },
      { role: 'styleAnchor', url: 'anchor.png' },
      { role: 'previousScene', url: 'prev.png' },
    ]);
  });

  // 11. Explicit limit
  it('respects an explicit limit parameter', () => {
    // Arrange
    const characters = [
      { name: 'Anna', imageUrl: 'a.png' },
      { name: 'Bob', imageUrl: 'b.png' },
    ] as CharacterItemEntity[];
    const references = buildSceneReferences({
      characters,
      styleAnchorImageUrl: 'anchor.png',
    });

    // Act
    const result = limitSceneReferences(references, 2);

    // Assert
    expect(result.references).toEqual([
      { role: 'character', url: 'a.png', name: 'Anna' },
      { role: 'character', url: 'b.png', name: 'Bob' },
    ]);
    expect(result.dropped).toEqual([
      { role: 'styleAnchor', url: 'anchor.png' },
    ]);
  });
});

describe('buildSceneReferenceBlock', () => {
  // 12. Empty list
  it('returns empty string for empty references list', () => {
    // Arrange & Act
    const result = buildSceneReferenceBlock([]);

    // Assert
    expect(result).toBe('');
  });

  // 13. Characters + эталон стиля + предыдущая сцена with numbering
  it('builds block with correct numbering and frame note for characters', () => {
    // Arrange
    const references = [
      { role: 'character' as const, url: 'a.png', name: 'Anna' },
      { role: 'character' as const, url: 'b.png', name: 'Bob' },
      { role: 'styleAnchor' as const, url: 'anchor.png' },
      { role: 'previousScene' as const, url: 'prev.png' },
    ];

    // Act
    const result = buildSceneReferenceBlock(references);

    // Assert
    const expected = [
      buildSceneCharacterReferenceLine(1, 'Anna'),
      buildSceneCharacterReferenceLine(2, 'Bob'),
      buildSceneStyleAnchorReferenceLine(3),
      buildScenePreviousSceneReferenceLine(4),
      SCENE_CHARACTER_SHEET_FRAME_NOTE,
    ].join('\n');

    expect(result).toBe(expected);
    expect(result).toContain('Изображение 1: Anna');
    expect(result).toContain('Изображение 4: предыдущая сцена');
  });

  // 14. Location reference line
  it('builds location reference line correctly', () => {
    // Arrange
    const references = [{ role: 'location' as const, url: 'l.png' }];

    // Act
    const result = buildSceneReferenceBlock(references);

    // Assert
    expect(result).toBe(
      'Изображение 1: локация — воспроизведи окружение и архитектуру.',
    );
  });

  // 15. No frame note without characters, numbering starts at 1
  it('omits frame note when there are no characters', () => {
    // Arrange
    const references = [
      { role: 'styleAnchor' as const, url: 'anchor.png' },
      { role: 'previousScene' as const, url: 'prev.png' },
    ];

    // Act
    const result = buildSceneReferenceBlock(references);

    // Assert
    expect(result).toContain('Изображение 1: эталон стиля');
    expect(result).toContain('Изображение 2: предыдущая сцена');
    expect(result).not.toContain(SCENE_CHARACTER_SHEET_FRAME_NOTE);
  });

  // 16. Frame note appears once at the end when multiple characters present
  it('includes frame note exactly once at the end for multiple characters', () => {
    // Arrange
    const references = [
      { role: 'character' as const, url: 'p1.png', name: 'P1' },
      { role: 'character' as const, url: 'p2.png', name: 'P2' },
      { role: 'character' as const, url: 'p3.png', name: 'P3' },
    ];

    // Act
    const result = buildSceneReferenceBlock(references);

    // Assert
    const noteOccurrences = (
      result.match(
        new RegExp(SCENE_CHARACTER_SHEET_FRAME_NOTE.substring(0, 20), 'g'),
      ) || []
    ).length;
    expect(noteOccurrences).toBeGreaterThan(0);
    const lines = result.split('\n');
    expect(lines[lines.length - 1]).toContain(
      'Референсы персонажей — это мастер-листы',
    );
  });
});
