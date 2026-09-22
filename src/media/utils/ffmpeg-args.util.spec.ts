import {
  buildNormalizedConcatFilterGraph,
  buildConcatListContent,
  buildTrimArgs,
} from './ffmpeg-args.util';

describe('ffmpeg-args utilities', () => {
  describe('buildNormalizedConcatFilterGraph', () => {
    it('builds the filter-graph with 3 inputs and vertical size', () => {
      // Arrange
      const inputCount = 3;
      const size = { width: 1280, height: 720 };

      // Act
      const filterGraph = buildNormalizedConcatFilterGraph(inputCount, size);

      // Assert
      const scaleOccurrences = filterGraph.match(
        /scale=1280:720:force_original_aspect_ratio=decrease/g,
      );
      const padOccurrences = filterGraph.match(/pad=1280:720:/g);
      const fpsOccurrences = filterGraph.match(/fps=24/g);
      const audioResampleOccurrences = filterGraph.match(
        /aresample=async=1:first_pts=0/g,
      );
      const concatPart = filterGraph.match(/concat=n=3:v=1:a=1\[v\]\[a\]/);

      expect(scaleOccurrences).toHaveLength(3);
      expect(padOccurrences).toHaveLength(3);
      expect(fpsOccurrences).toHaveLength(3);
      expect(audioResampleOccurrences).toHaveLength(3);
      expect(concatPart).not.toBeNull();
    });
  });

  describe('buildConcatListContent', () => {
    it('builds the concat demuxer list with proper escaping', () => {
      // Arrange
      const paths = ['/tmp/a.mp4', "/tmp/it's b.mp4"];

      // Act
      const content = buildConcatListContent(paths);

      // Assert
      expect(content).toBe("file '/tmp/a.mp4'\nfile '/tmp/it'\\''s b.mp4'");
    });
  });

  describe('buildTrimArgs', () => {
    it('builds trim args without crop (stream copy)', () => {
      // Arrange
      const inputPath = 'in.mp4';
      const outputPath = 'out.mp4';
      const options = { startSec: 1, durationSec: 4 };

      // Act
      const args = buildTrimArgs(inputPath, outputPath, options);

      // Assert
      expect(args).toEqual([
        '-y',
        '-i',
        'in.mp4',
        '-ss',
        '1',
        '-t',
        '4',
        '-c',
        'copy',
        'out.mp4',
      ]);
    });

    it('builds trim args with crop by exact size (with re-encode)', () => {
      // Arrange
      const inputPath = 'in.mp4';
      const outputPath = 'out.mp4';
      const options = {
        startSec: 0,
        endSec: 10,
        crop: { width: 720, height: 1280 },
      };

      // Act
      const args = buildTrimArgs(inputPath, outputPath, options);

      // Assert
      expect(args).toContain('-to');
      expect(args).toContain('10');
      expect(args).toContain('-vf');
      const vfIndex = args.indexOf('-vf');
      expect(args[vfIndex + 1]).toBe(
        'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
      );
      expect(args).not.toContain('-c');
      expect(args).not.toContain('copy');
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
      expect(args).toContain('-c:a');
      expect(args).toContain('aac');
      expect(args[args.length - 1]).toBe('out.mp4');
    });
  });
});
