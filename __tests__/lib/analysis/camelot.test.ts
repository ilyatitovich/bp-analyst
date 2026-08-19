import { describe, expect, it } from 'vitest';
import {
  camelotToScale,
  formatTrackKey,
  getCompatibleCamelotKeys,
  parseScaleName,
  scaleToCamelot,
  toCamelot,
} from '../../../src/lib/analysis/camelot';

describe('camelot helpers', () => {
  it('formats a camelot key', () => {
    expect(toCamelot(11, 'b')).toBe('11B');
  });

  it('returns harmonic neighbors', () => {
    expect(getCompatibleCamelotKeys('8A')).toEqual(['8A', '9A', '7A', '8B']);
  });

  it('parses Beatport scale names', () => {
    expect(parseScaleName('A Major')).toBe('A maj');
    expect(parseScaleName('A Minor')).toBe('A min');
    expect(parseScaleName('F♯ Minor')).toBe('F# min');
    expect(parseScaleName('B♭ Major')).toBe('Bb maj');
  });

  it('maps scale names onto the camelot wheel', () => {
    expect(scaleToCamelot('A Minor')).toBe('8A');
    expect(scaleToCamelot('A Major')).toBe('11B');
    expect(scaleToCamelot('G# min')).toBe('1A');
    expect(camelotToScale('8A')).toBe('A min');
    expect(camelotToScale('11B')).toBe('A maj');
  });

  it('formats a track key in both notations', () => {
    expect(formatTrackKey('11B', 'A Major', 'camelot')).toBe('11B');
    expect(formatTrackKey('11B', 'A Major', 'scale')).toBe('A maj');
    expect(formatTrackKey(null, 'A Minor', 'camelot')).toBe('8A');
  });
});
