import { describe, expect, it } from 'vitest';
import {
  classifyMixType,
  computeTrackStats,
  parsePublishDate,
} from './stats';
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

  it('computes exclusive and hype shares', () => {
    const stats = computeTrackStats([
      { ...baseTrack, id: 1, exclusive: true, hype: false },
      { ...baseTrack, id: 2, exclusive: true, hype: true },
      { ...baseTrack, id: 3, exclusive: false, hype: false },
      { ...baseTrack, id: 4, exclusive: false, hype: false },
    ]);

    expect(stats.exclusiveCount).toBe(2);
    expect(stats.exclusiveShare).toBe(0.5);
    expect(stats.hypeCount).toBe(1);
    expect(stats.hypeShare).toBe(0.25);
  });

  it('parses ISO and Beatport display publish dates', () => {
    expect(parsePublishDate('2026-08-01')?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(parsePublishDate('Aug 12, 2026')?.toISOString()).toBe('2026-08-12T00:00:00.000Z');
    expect(parsePublishDate('12 August 2026')?.toISOString()).toBe('2026-08-12T00:00:00.000Z');
    expect(parsePublishDate('not a date')).toBeNull();
  });

  it('computes 7-day and 30-day freshness shares', () => {
    const now = new Date('2026-08-18T12:00:00.000Z');
    const stats = computeTrackStats(
      [
        { ...baseTrack, id: 1, publishDate: '2026-08-12' },
        { ...baseTrack, id: 2, publishDate: 'Aug 15, 2026' },
        { ...baseTrack, id: 3, publishDate: '2026-07-20' },
        { ...baseTrack, id: 4, publishDate: '2026-07-01' },
        { ...baseTrack, id: 5, publishDate: null },
      ],
      { now },
    );

    expect(stats.freshness7Count).toBe(2);
    expect(stats.freshness7Share).toBe(0.4);
    expect(stats.freshness30Count).toBe(3);
    expect(stats.freshness30Share).toBe(0.6);
  });

  it('classifies mix names into original, extended, radio, remix, and other', () => {
    expect(classifyMixType('Original Mix')).toBe('Original');
    expect(classifyMixType('')).toBe('Original');
    expect(classifyMixType('Extended Mix')).toBe('Extended');
    expect(classifyMixType('Radio Edit')).toBe('Radio');
    expect(classifyMixType('Amelie Lens Remix')).toBe('Remix');
    expect(classifyMixType('Extended Remix')).toBe('Remix');
    expect(classifyMixType('Club Mix')).toBe('Other');
  });

  it('builds mix-type and length-band histograms', () => {
    const stats = computeTrackStats([
      { ...baseTrack, id: 1, mixName: 'Original Mix', lengthMs: 180000, length: '3:00' },
      { ...baseTrack, id: 2, mixName: 'Extended Mix', lengthMs: 300000, length: '5:00' },
      { ...baseTrack, id: 3, mixName: 'Radio Edit', lengthMs: null, length: '6:30' },
      { ...baseTrack, id: 4, mixName: 'Artist Remix', lengthMs: 540000, length: '9:00' },
      { ...baseTrack, id: 5, mixName: 'Club Mix', lengthMs: 240000, length: '4:00' },
    ]);

    expect(stats.mixTypeHistogram).toEqual([
      { label: 'Original', count: 1 },
      { label: 'Extended', count: 1 },
      { label: 'Radio', count: 1 },
      { label: 'Remix', count: 1 },
      { label: 'Other', count: 1 },
    ]);
    expect(stats.lengthHistogram).toEqual([
      { label: '<4', count: 1 },
      { label: '4–6', count: 2 },
      { label: '6–8', count: 1 },
      { label: '8+', count: 1 },
    ]);
  });

  it('computes key concentration and BPM quartiles', () => {
    const stats = computeTrackStats([
      { ...baseTrack, id: 1, bpm: 120, camelot: '8A', keyName: 'A Minor' },
      { ...baseTrack, id: 2, bpm: 124, camelot: '8A', keyName: 'A Minor' },
      { ...baseTrack, id: 3, bpm: 128, camelot: '11B', keyName: 'A Major' },
      { ...baseTrack, id: 4, bpm: 132, camelot: '9A', keyName: 'E Minor' },
      { ...baseTrack, id: 5, bpm: 128, camelot: '4A', keyName: 'F Minor' },
    ]);

    expect(stats.keyConcentrationKeys).toEqual(['8A', '11B', '4A']);
    expect(stats.keyConcentrationShare).toBe(0.8);
    expect(stats.bpmP25).toBe(124);
    expect(stats.bpmMedian).toBe(128);
    expect(stats.bpmP75).toBe(128);
  });

  it('computes top-5 label and artist concentration as a share of the page', () => {
    const stats = computeTrackStats([
      { ...baseTrack, id: 1, label: { name: 'Anjunadeep' }, artists: [{ name: 'Alpha' }] },
      { ...baseTrack, id: 2, label: { name: 'Anjunadeep' }, artists: [{ name: 'Alpha' }, { name: 'Beta' }] },
      { ...baseTrack, id: 3, label: { name: 'Toolroom' }, artists: [{ name: 'Gamma' }] },
      { ...baseTrack, id: 4, label: { name: 'Defected' }, artists: [{ name: 'Delta' }] },
      { ...baseTrack, id: 5, label: { name: 'Crosstown' }, artists: [{ name: 'Echo' }] },
      { ...baseTrack, id: 6, label: { name: 'Hot Creations' }, artists: [{ name: 'Foxtrot' }] },
      { ...baseTrack, id: 7, label: { name: 'Zulu' }, artists: [{ name: 'Golf' }] },
      { ...baseTrack, id: 8, label: null, artists: [] },
    ]);

    expect(stats.labelConcentration).toEqual([
      { label: 'Anjunadeep', count: 2 },
      { label: 'Crosstown', count: 1 },
      { label: 'Defected', count: 1 },
      { label: 'Hot Creations', count: 1 },
      { label: 'Toolroom', count: 1 },
    ]);
    expect(stats.labelConcentrationShare).toBe(6 / 8);
    expect(stats.artistConcentration.map((item) => item.label)).toEqual([
      'Alpha',
      'Beta',
      'Delta',
      'Echo',
      'Foxtrot',
    ]);
    expect(stats.artistConcentrationShare).toBe(5 / 8);
  });
});
