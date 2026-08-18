import { describe, expect, it } from 'vitest';
import { mergeSnapshots } from './merge';
import type { ExtractionSnapshot, Track } from '../types/track';

const context = {
  pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
  pageTitle: 'Tech House Top 100',
  extractedAt: '2026-08-18T10:00:00.000Z',
};

function track(id: number, position: number, extras: Partial<Track> = {}): Track {
  return {
    id,
    position,
    title: `Track ${id}`,
    mixName: 'Extended Mix',
    artists: [{ name: 'Artist' }],
    remixers: [],
    bpm: 124,
    keyName: 'A Major',
    camelot: extras.camelot ?? '11B',
    genre: { name: 'Tech House' },
    subGenre: null,
    label: { name: 'Label' },
    releaseName: 'Release',
    length: '5:00',
    lengthMs: 300000,
    publishDate: '2026-08-01',
    price: '$1.69',
    exclusive: false,
    hype: false,
    isrc: null,
    slug: `track-${id}`,
    trackUrl: `https://www.beatport.com/track/track-${id}/${id}`,
    pageUrl: context.pageUrl,
    pageTitle: context.pageTitle,
    extractedAt: context.extractedAt,
    source: 'api-payload',
    ...extras,
  };
}

function snapshot(tracks: Track[], source: ExtractionSnapshot['source'] = 'api-payload'): ExtractionSnapshot {
  return {
    ...context,
    source,
    trackCount: tracks.length,
    tracks,
  };
}

describe('mergeSnapshots', () => {
  it('keeps a larger top-100 list when a 10-track payload arrives', () => {
    const current = snapshot(Array.from({ length: 100 }, (_, index) => track(index + 1, index + 1)));
    const incoming = snapshot(Array.from({ length: 10 }, (_, index) => track(index + 201, index + 1)));

    const merged = mergeSnapshots(current, incoming);
    expect(merged?.trackCount).toBe(100);
  });

  it('replaces a 10-track first page with a later 100-track payload', () => {
    const current = snapshot(Array.from({ length: 10 }, (_, index) => track(index + 1, index + 1)));
    const incoming = snapshot(Array.from({ length: 100 }, (_, index) => track(index + 1, index + 1)));

    const merged = mergeSnapshots(current, incoming);
    expect(merged?.trackCount).toBe(100);
  });

  it('appends a second page of unique tracks', () => {
    const current = snapshot(Array.from({ length: 10 }, (_, index) => track(index + 1, index + 1)));
    const incoming = snapshot(Array.from({ length: 10 }, (_, index) => track(index + 11, index + 1)));

    const merged = mergeSnapshots(current, incoming);
    expect(merged?.trackCount).toBe(20);
    expect(merged?.tracks.at(-1)?.id).toBe(20);
    expect(merged?.tracks.at(-1)?.position).toBe(20);
  });

  it('drops duplicate ids from a single payload', () => {
    const incoming = snapshot([track(1, 1), track(1, 2), track(2, 3)]);
    const merged = mergeSnapshots(null, incoming);
    expect(merged?.trackCount).toBe(2);
    expect(merged?.tracks.map((item) => item.id)).toEqual([1, 2]);
  });

  it('drops the same title by the same artists even when ids and mix differ', () => {
    const incoming = snapshot([
      track(10, 1, { title: 'Beat Goes On', mixName: 'Extended Mix', artists: [{ name: 'Rafael' }] }),
      track(99, 2, { title: 'Beat Goes On', mixName: 'Radio Edit', artists: [{ name: 'Rafael' }] }),
      track(11, 3, { title: 'Beat Goes On', artists: [{ name: 'Other Artist' }] }),
    ]);
    const merged = mergeSnapshots(null, incoming);
    expect(merged?.trackCount).toBe(2);
    expect(merged?.tracks.map((item) => item.artists[0]?.name)).toEqual(['Rafael', 'Other Artist']);
  });
});
