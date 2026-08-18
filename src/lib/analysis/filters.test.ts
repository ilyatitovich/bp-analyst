import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRACK_SORT,
  filterTracks,
  hasActiveFilters,
  nextTrackSort,
  parseBpmBucket,
  sortTracks,
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
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, includeHypeOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, titleQuery: 'night' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, mixTypes: ['Original'] })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, publishedWithinDays: 7 })).toBe(true);
  });

  it('filters by title, mix name, and artist query', () => {
    const tracks: Track[] = [
      { ...baseTrack, id: 1, title: 'Night Drive', mixName: 'Original Mix', artists: [{ name: 'Nova' }] },
      { ...baseTrack, id: 2, title: 'Sunrise', mixName: 'Club Mix', artists: [{ name: 'Delta' }] },
      { ...baseTrack, id: 3, title: 'Pulse', mixName: 'Extended Mix', artists: [{ name: 'Nova' }] },
    ];

    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, titleQuery: 'night' }).map((track) => track.id),
    ).toEqual([1]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, titleQuery: 'CLUB' }).map((track) => track.id),
    ).toEqual([2]);
    expect(
      filterTracks(tracks, { ...DEFAULT_FILTERS, titleQuery: ' nova ' }).map((track) => track.id),
    ).toEqual([1, 3]);
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

  it('cycles sort column and direction', () => {
    expect(nextTrackSort(DEFAULT_TRACK_SORT, 'position')).toEqual({
      column: 'position',
      direction: 'desc',
    });
    expect(nextTrackSort(DEFAULT_TRACK_SORT, 'date')).toEqual({
      column: 'date',
      direction: 'desc',
    });
    expect(nextTrackSort({ column: 'date', direction: 'desc' }, 'date')).toEqual({
      column: 'date',
      direction: 'asc',
    });
    expect(nextTrackSort({ column: 'bpm', direction: 'asc' }, 'label')).toEqual({
      column: 'label',
      direction: 'asc',
    });
  });

  it('sorts tracks by position, bpm, key, date, and label', () => {
    const tracks: Track[] = [
      { ...baseTrack, id: 1, position: 3, bpm: 128, camelot: '8A', keyName: 'A Minor', label: { name: 'Zebra' }, publishDate: '2026-08-01' },
      { ...baseTrack, id: 2, position: 1, bpm: null, camelot: '11B', keyName: 'A Major', label: { name: 'Alpha' }, publishDate: '2026-07-01' },
      { ...baseTrack, id: 3, position: 2, bpm: 122, camelot: null, keyName: null, label: null, publishDate: null },
    ];

    expect(sortTracks(tracks, DEFAULT_TRACK_SORT).map((track) => track.id)).toEqual([2, 3, 1]);
    expect(
      sortTracks(tracks, { column: 'bpm', direction: 'asc' }).map((track) => track.id),
    ).toEqual([3, 1, 2]);
    expect(
      sortTracks(tracks, { column: 'bpm', direction: 'desc' }).map((track) => track.id),
    ).toEqual([1, 3, 2]);
    expect(
      sortTracks(tracks, { column: 'key', direction: 'asc' }).map((track) => track.id),
    ).toEqual([1, 2, 3]);
    expect(
      sortTracks(tracks, { column: 'date', direction: 'desc' }).map((track) => track.id),
    ).toEqual([1, 2, 3]);
    expect(
      sortTracks(tracks, { column: 'label', direction: 'asc' }).map((track) => track.id),
    ).toEqual([2, 1, 3]);
  });
});
