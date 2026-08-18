import { describe, expect, it } from 'vitest';
import { computeTrackStats } from './stats';
import type { Track } from '../types/track';

const baseTrack: Track = {
  id: 1,
  position: 1,
  title: 'Track',
  mixName: 'Extended Mix',
  artists: [{ name: 'Artist' }],
  remixers: [],
  bpm: 124,
  keyName: 'A Major',
  camelot: '11B',
  genre: { name: 'Tech House' },
  subGenre: null,
  label: { name: 'Label One' },
  releaseName: 'Release',
  length: '5:00',
  lengthMs: 300000,
  publishDate: '2026-08-01',
  price: '$1.69',
  exclusive: false,
  hype: false,
  isrc: null,
  slug: 'track',
  trackUrl: 'https://www.beatport.com/track/track/1',
  previewUrl: null,
  previewStartMs: null,
  previewEndMs: null,
  artworkUrl: null,
  pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
  pageTitle: 'Tech House Top 100',
  extractedAt: '2026-08-18T08:00:00.000Z',
  source: 'next-data',
};

describe('computeTrackStats', () => {
  it('computes bpm and category distributions', () => {
    const stats = computeTrackStats([
      baseTrack,
      { ...baseTrack, id: 2, bpm: 126, camelot: '11B', label: { name: 'Label One' } },
      { ...baseTrack, id: 3, bpm: 126, camelot: '8A', label: { name: 'Label Two' } },
    ]);

    expect(stats.count).toBe(3);
    expect(stats.bpmMin).toBe(124);
    expect(stats.bpmMax).toBe(126);
    expect(stats.bpmMedian).toBe(126);
    expect(stats.bpmMode).toBe(126);
    expect(stats.camelotHistogram.find((bucket) => bucket.label === '11B')).toEqual({ label: '11B', count: 2 });
    expect(stats.camelotHistogram.find((bucket) => bucket.label === '8A')).toEqual({ label: '8A', count: 1 });
    expect(stats.camelotHistogram).toHaveLength(24);
    expect(stats.scaleHistogram.find((bucket) => bucket.label === 'A maj')?.count).toBe(2);
    expect(stats.scaleHistogram.find((bucket) => bucket.label === 'A min')?.count).toBe(1);
    expect(stats.camelotMode).toBe('11B');
    expect(stats.camelotMedian).toBe('11B');
    expect(stats.labelDistribution).toEqual([
      { label: 'Label One', count: 2 },
      { label: 'Label Two', count: 1 },
    ]);
    expect(stats.bpmHistogram.map((bucket) => bucket.label)).toEqual([
      '105-109',
      '110-114',
      '115-119',
      '120-124',
      '125-129',
      '130-134',
      '135-139',
      '140-144',
    ]);
    expect(stats.bpmHistogram.find((bucket) => bucket.label === '120-124')?.count).toBe(1);
    expect(stats.bpmHistogram.find((bucket) => bucket.label === '125-129')?.count).toBe(2);
  });

  it('computes key median along the camelot order', () => {
    const stats = computeTrackStats([
      { ...baseTrack, id: 1, camelot: '8A', keyName: 'A Minor' },
      { ...baseTrack, id: 2, camelot: '10A', keyName: 'B Minor' },
      { ...baseTrack, id: 3, camelot: '9A', keyName: 'E Minor' },
      { ...baseTrack, id: 4, camelot: '8A', keyName: 'A Minor' },
    ]);

    expect(stats.camelotMedian).toBe('8A');
    expect(stats.camelotMode).toBe('8A');
  });
});
