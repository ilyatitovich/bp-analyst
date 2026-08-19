import { describe, expect, it } from 'vitest';
import {
  formatPreviewTime,
  previewElapsedSec,
  previewProgress,
  previewWindow,
  resolvedPreviewWindow,
  seekTimeFromProgress,
} from '../../../src/lib/player/preview';

describe('previewWindow', () => {
  it('uses Beatport sample offsets when present', () => {
    expect(previewWindow({ previewStartMs: 130000, previewEndMs: 250000 })).toEqual({
      startSec: 130,
      endSec: 250,
      durationSec: 120,
    });
  });

  it('falls back to a two-minute window from the start offset', () => {
    expect(previewWindow({ previewStartMs: 45000, previewEndMs: null })).toEqual({
      startSec: 45,
      endSec: 165,
      durationSec: 120,
    });
  });
});

describe('resolvedPreviewWindow', () => {
  it('keeps Beatport offsets when they fit the audio file', () => {
    expect(
      resolvedPreviewWindow({ previewStartMs: 130000, previewEndMs: 250000 }, 360),
    ).toEqual({
      startSec: 130,
      endSec: 250,
      durationSec: 120,
    });
  });

  it('plays a standalone clip from the start when offsets fall outside the file', () => {
    expect(
      resolvedPreviewWindow({ previewStartMs: 130000, previewEndMs: 250000 }, 120),
    ).toEqual({
      startSec: 0,
      endSec: 120,
      durationSec: 120,
    });
  });
});

describe('preview progress helpers', () => {
  const window = previewWindow({ previewStartMs: 100000, previewEndMs: 160000 });

  it('maps currentTime into the preview window', () => {
    expect(previewProgress(100, window)).toBe(0);
    expect(previewProgress(130, window)).toBe(0.5);
    expect(previewProgress(160, window)).toBe(1);
    expect(previewElapsedSec(130, window)).toBe(30);
  });

  it('converts a scrub position back to audio time', () => {
    expect(seekTimeFromProgress(0.25, window)).toBe(115);
  });

  it('formats elapsed preview time', () => {
    expect(formatPreviewTime(0)).toBe('0:00');
    expect(formatPreviewTime(75)).toBe('1:15');
  });
});
