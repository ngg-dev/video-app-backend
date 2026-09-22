jest.mock('src/shared/utils', () => ({
  isNotNullOrUndefined: <T>(value: T): boolean =>
    value !== null && value !== undefined,
}));

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { MediaService } from './media.service';
import type { FfmpegService } from './ffmpeg/ffmpeg.service';

describe('MediaService', () => {
  let ffmpeg: { runFfmpeg: jest.Mock };
  let service: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    ffmpeg = { runFfmpeg: jest.fn().mockResolvedValue(undefined) };
    service = new MediaService(ffmpeg as unknown as FfmpegService);
  });

  describe('concatNormalized', () => {
    it('builds the filter-graph for the given target size', async () => {
      // Arrange
      const inputPaths = ['a.mp4', 'b.mp4'];

      // Act
      await service.concatNormalized(inputPaths, 'out.mp4', {
        width: 1280,
        height: 720,
      });

      // Assert
      const [args] = ffmpeg.runFfmpeg.mock.calls[0] as [string[]];
      const filterIndex = args.indexOf('-filter_complex');
      expect(filterIndex).toBeGreaterThan(-1);
      const filterGraph = args[filterIndex + 1];
      const scaleOccurrences = filterGraph.match(
        /scale=1280:720:force_original_aspect_ratio=decrease/g,
      );
      const padOccurrences = filterGraph.match(/pad=1280:720:/g);
      expect(scaleOccurrences).toHaveLength(2);
      expect(padOccurrences).toHaveLength(2);
      expect(filterGraph).toContain('concat=n=2:v=1:a=1[v][a]');

      // Verify encoding parameters are present
      expect(args).toContain('-c:v');
      const c_vIndex = args.indexOf('-c:v');
      expect(args[c_vIndex + 1]).toBe('libx264');

      expect(args).toContain('-preset');
      const presetIndex = args.indexOf('-preset');
      expect(args[presetIndex + 1]).toBe('veryfast');

      expect(args).toContain('-crf');
      const crfIndex = args.indexOf('-crf');
      expect(args[crfIndex + 1]).toBe('20');

      expect(args).toContain('-c:a');
      const c_aIndex = args.indexOf('-c:a');
      expect(args[c_aIndex + 1]).toBe('aac');

      expect(args).toContain('-b:a');
      const b_aIndex = args.indexOf('-b:a');
      expect(args[b_aIndex + 1]).toBe('192k');

      expect(args).toContain('-movflags');
      const movflagsIndex = args.indexOf('-movflags');
      expect(args[movflagsIndex + 1]).toBe('+faststart');
    });

    it('rejects an empty input list without calling ffmpeg', async () => {
      // Arrange
      // ffmpeg/service already set up in beforeEach

      // Act & Assert
      await expect(
        service.concatNormalized([], 'out.mp4', { width: 720, height: 1280 }),
      ).rejects.toThrow('No videos to concatenate.');
      expect(ffmpeg.runFfmpeg).not.toHaveBeenCalled();
    });
  });

  describe('concatNormalizedVertical', () => {
    it('keeps the vertical 720x1280 filter-graph (public contract unchanged)', async () => {
      // Arrange
      const inputPaths = ['a.mp4', 'b.mp4'];

      // Act
      await service.concatNormalizedVertical(inputPaths, 'out.mp4');

      // Assert
      const [args] = ffmpeg.runFfmpeg.mock.calls[0] as [string[]];
      const filterIndex = args.indexOf('-filter_complex');
      const filterGraph = args[filterIndex + 1];
      expect(filterGraph).toContain('scale=720:1280:');
      expect(filterGraph).toContain('pad=720:1280:');
    });
  });
});
