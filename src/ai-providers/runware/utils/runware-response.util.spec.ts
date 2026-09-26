import type { RunwareRunResult } from '../types/runware.types';
import {
  extractImageUrl,
  extractVideoUrl,
  extractText,
  extractCost,
} from './runware-response.util';

describe('extractImageUrl', () => {
  it('returns imageURL from the first element when present', () => {
    // Arrange
    const results: RunwareRunResult[] = [
      { imageURL: 'https://r/i.png' },
      { imageURL: 'https://r/j.png' },
    ];

    // Act
    const result = extractImageUrl(results);

    // Assert
    expect(result).toBe('https://r/i.png');
  });

  it('returns null for empty array', () => {
    // Arrange
    const results: RunwareRunResult[] = [];

    // Act
    const result = extractImageUrl(results);

    // Assert
    expect(result).toBeNull();
  });

  it('returns null when imageURL is missing', () => {
    // Arrange
    const results: RunwareRunResult[] = [{}];

    // Act
    const result = extractImageUrl(results);

    // Assert
    expect(result).toBeNull();
  });

  it('returns null when imageURL is an empty string', () => {
    // Arrange
    const results: RunwareRunResult[] = [{ imageURL: '' }];

    // Act
    const result = extractImageUrl(results);

    // Assert
    expect(result).toBeNull();
  });

  it('returns null when imageURL is not a string', () => {
    // Arrange
    const results: RunwareRunResult[] = [{ imageURL: 42 }];

    // Act
    const result = extractImageUrl(results);

    // Assert
    expect(result).toBeNull();
  });
});

describe('extractVideoUrl', () => {
  it('returns videoURL from the first element when present', () => {
    // Arrange
    const results: RunwareRunResult[] = [
      { videoURL: 'https://r/v.mp4' },
      { videoURL: 'https://r/w.mp4' },
    ];

    // Act
    const result = extractVideoUrl(results);

    // Assert
    expect(result).toBe('https://r/v.mp4');
  });

  it('returns null for empty array', () => {
    // Arrange
    const results: RunwareRunResult[] = [];

    // Act
    const result = extractVideoUrl(results);

    // Assert
    expect(result).toBeNull();
  });

  it('returns null when videoURL is an empty string', () => {
    // Arrange
    const results: RunwareRunResult[] = [{ videoURL: '' }];

    // Act
    const result = extractVideoUrl(results);

    // Assert
    expect(result).toBeNull();
  });
});

describe('extractText', () => {
  it('returns text from the first element when present', () => {
    // Arrange
    const results: RunwareRunResult[] = [{ text: 'hello' }];

    // Act
    const result = extractText(results);

    // Assert
    expect(result).toBe('hello');
  });

  it('returns null for empty array', () => {
    // Arrange
    const results: RunwareRunResult[] = [];

    // Act
    const result = extractText(results);

    // Assert
    expect(result).toBeNull();
  });

  it('returns null when text is an empty string', () => {
    // Arrange
    const results: RunwareRunResult[] = [{ text: '' }];

    // Act
    const result = extractText(results);

    // Assert
    expect(result).toBeNull();
  });
});

describe('extractCost', () => {
  it('returns cost number from the first element when present', () => {
    // Arrange
    const results: RunwareRunResult[] = [{ cost: 0.01 }];

    // Act
    const result = extractCost(results);

    // Assert
    expect(result).toBe(0.01);
  });

  it('returns null when cost is missing', () => {
    // Arrange
    const results: RunwareRunResult[] = [{}];

    // Act
    const result = extractCost(results);

    // Assert
    expect(result).toBeNull();
  });

  it('returns null for empty array', () => {
    // Arrange
    const results: RunwareRunResult[] = [];

    // Act
    const result = extractCost(results);

    // Assert
    expect(result).toBeNull();
  });
});
