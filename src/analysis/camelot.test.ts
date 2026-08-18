import { describe, expect, it } from 'vitest';
import { getCompatibleCamelotKeys, toCamelot } from './camelot';

describe('camelot helpers', () => {
  it('formats a camelot key', () => {
    expect(toCamelot(11, 'b')).toBe('11B');
  });

  it('returns harmonic neighbors', () => {
    expect(getCompatibleCamelotKeys('8A')).toEqual(['8A', '9A', '7A', '8B']);
  });
});
