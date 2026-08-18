import { describe, expect, it } from 'vitest';
import {
  filterTracks,
  hasActiveFilters,
  parseBpmBucket,
  toggleListValue,
} from './filters';
import { DEFAULT_FILTERS, type Track } from '../types/track';

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

describe('chart filters', () => {
  it('parses bpm histogram bucket labels', () => {
    expect(parseBpmBucket('120-124')).toEqual({ min: 120, max: 124 });
    expect(parseBpmBucket('invalid')).toBeNull();
  });

  it('toggles values in a filter list', () => {
    expect(toggleListValue(['8A'], '11B')).toEqual(['8A', '11B']);
    expect(toggleListValue(['8A', '11B'], '8A')).toEqual(['11B']);
  });

  it('filters tracks by selected bpm buckets, keys, genres, and labels', () => {
    const tracks: Track[] = [
      baseTrack,
      { ...baseTrack, id: 2, bpm: 128, camelot: '8A', keyName: 'A Minor', genre: { name: 'House' }, label: { name: 'Label Two' } },
      { ...baseTrack, id: 3, bpm: 140, camelot: '8A', keyName: 'A Minor' },
    ];

    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, bpmBuckets: ['125-129'] }).map((track) => track.id),
    ).toEqual([2]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, bpmBuckets: ['120-124', '125-129'] }).map((track) => track.id),
    ).toEqual([1, 2]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, camelotKeys: ['8A'] }).map((track) => track.id),
    ).toEqual([2, 3]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, genreNames: ['House'] }).map((track) => track.id),
    ).toEqual([2]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, labelNames: ['Label Two'] }).map((track) => track.id),
    ).toEqual([2]);
    expect(
      filterTracks(tracks, {
        ...DEFAULT_FILTERS,
        bpmBuckets: ['120-124', '125-129'],
        camelotKeys: ['11B'],
      }).map((track) => track.id),
    ).toEqual([1]);
  });

  it('reports when chart filters are active', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, bpmBuckets: ['120-124'] })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, labelNames: ['Anjunadeep'] })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, includeExclusiveOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, mixTypes: ['Original'] })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, publishedWithinDays: 7 })).toBe(true);
  });

  it('filters exclusive, hype, mix type, artists, and freshness', () => {
    const now = new Date('2026-08-18T12:00:00.000Z');
    const tracks: Track[] = [
      { ...baseTrack, id: 1, exclusive: true, hype: false, mixName: 'Original Mix', artists: [{ name: 'Alpha' }], publishDate: '2026-08-16' },
      { ...baseTrack, id: 2, exclusive: false, hype: true, mixName: 'Extended Mix', artists: [{ name: 'Beta' }], publishDate: '2026-07-20' },
      { ...baseTrack, id: 3, exclusive: true, hype: true, mixName: 'Artist Remix', artists: [{ name: 'Alpha' }, { name: 'Gamma' }], publishDate: '2026-07-01' },
    ];

    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, includeExclusiveOnly: true }).map((track) => track.id),
    ).toEqual([1, 3]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, includeHypeOnly: true }).map((track) => track.id),
    ).toEqual([2, 3]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, mixTypes: ['Original', 'Remix'] }).map((track) => track.id),
    ).toEqual([1, 3]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, artistNames: ['Alpha'] }).map((track) => track.id),
    ).toEqual([1, 3]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, publishedWithinDays: 7 }, now).map((track) => track.id),
    ).toEqual([1]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, publishedWithinDays: 30 }, now).map((track) => track.id),
    ).toEqual([1, 2]);
  });
});
