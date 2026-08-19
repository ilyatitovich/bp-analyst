import { describe, expect, it } from 'vitest';
import { looksLikeRawTrack, normalizeTrack, uniqueTracks } from './normalize';
import type { Track } from '../types/track';

const context = {
  pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
  pageTitle: 'Tech House Top 100',
  source: 'next-data' as const,
};

const baseRaw = {
  id: 29486878,
  name: 'Beat Goes On',
  mix_name: 'Extended Mix',
  artists: [{ id: 1, name: 'Rafael', slug: 'rafael' }],
  remixers: [],
  bpm: 124,
  key: { name: 'A Major', camelot_number: 11, camelot_letter: 'B' },
  genre: { id: 11, name: 'Tech House', slug: 'tech-house' },
  release: {
    name: 'Beat Goes On (Extended Mix)',
    label: { id: 96547, name: 'Maccabi House', slug: 'maccabi-house' },
  },
  slug: 'beat-goes-on',
};

describe('normalizeTrack preview fields', () => {
  it('reads sample_url, offsets, and artwork from catalog tracks', () => {
    const track = normalizeTrack(
      {
        ...baseRaw,
        sample_url: 'https://geo-samples.beatport.com/track/abc.LOFI.mp3',
        sample_start_ms: 130976,
        sample_end_ms: 250976,
        image: {
          uri: 'https://geo-media.beatport.com/image_size/590x404/art.jpg',
          dynamic_uri: 'https://geo-media.beatport.com/image_size/{w}x{h}/art.jpg',
        },
      },
      context,
      1,
    );

    expect(track?.previewUrl).toBe('https://geo-samples.beatport.com/track/abc.LOFI.mp3');
    expect(track?.previewStartMs).toBe(130976);
    expect(track?.previewEndMs).toBe(250976);
    expect(track?.artworkUrl).toBe('https://geo-media.beatport.com/image_size/80x80/art.jpg');
  });

  it('falls back to nested sample.mp3 fields and release artwork', () => {
    const track = normalizeTrack(
      {
        ...baseRaw,
        sample: {
          mp3: {
            url: 'https://geo-samples.beatport.com/track/nested.LOFI.mp3',
            offset: { start: 20000, end: 140000 },
          },
        },
        release: {
          ...baseRaw.release,
          image: { uri: 'https://geo-media.beatport.com/image_size/500x500/release.jpg' },
        },
      },
      context,
      1,
    );

    expect(track?.previewUrl).toBe('https://geo-samples.beatport.com/track/nested.LOFI.mp3');
    expect(track?.previewStartMs).toBe(20000);
    expect(track?.previewEndMs).toBe(140000);
    expect(track?.artworkUrl).toBe('https://geo-media.beatport.com/image_size/80x80/release.jpg');
  });
});

describe('normalizeTrack sanitizes broken rows', () => {
  it('rejects empty or whitespace titles', () => {
    expect(normalizeTrack({ ...baseRaw, name: '' }, context, 1)).toBeNull();
    expect(normalizeTrack({ ...baseRaw, name: '   ' }, context, 1)).toBeNull();
    expect(looksLikeRawTrack({ ...baseRaw, name: '' })).toBe(false);
  });

  it('rejects tracks with no named artists', () => {
    expect(normalizeTrack({ ...baseRaw, artists: [] }, context, 1)).toBeNull();
    expect(normalizeTrack({ ...baseRaw, artists: [{ name: '  ' }] }, context, 1)).toBeNull();
    expect(normalizeTrack({ ...baseRaw, artists: undefined }, context, 1)).toBeNull();
  });

  it('rejects missing, zero, or out-of-range BPM', () => {
    expect(normalizeTrack({ ...baseRaw, bpm: null }, context, 1)).toBeNull();
    expect(normalizeTrack({ ...baseRaw, bpm: 0 }, context, 1)).toBeNull();
    expect(normalizeTrack({ ...baseRaw, bpm: -124 }, context, 1)).toBeNull();
    expect(normalizeTrack({ ...baseRaw, bpm: 400 }, context, 1)).toBeNull();
  });

  it('trims blank optional fields and keeps a valid track', () => {
    const track = normalizeTrack(
      {
        ...baseRaw,
        name: '  Beat Goes On  ',
        artists: [{ id: 1, name: '  Rafael  ', slug: 'rafael' }],
        mix_name: '  Extended Mix  ',
        key: { name: '  A Major  ', camelot_number: 11, camelot_letter: 'B' },
        isrc: '   ',
        publish_date: '',
      },
      context,
      1,
    );

    expect(track).toMatchObject({
      title: 'Beat Goes On',
      mixName: 'Extended Mix',
      artists: [{ name: 'Rafael' }],
      bpm: 124,
      keyName: 'A Major',
      isrc: null,
      publishDate: null,
    });
  });
});

describe('uniqueTracks', () => {
  it('drops rows that are missing identity or BPM', () => {
    const usable: Track = {
      id: 1,
      position: 1,
      title: 'Keep Me',
      mixName: '',
      artists: [{ name: 'DJ' }],
      remixers: [],
      bpm: 128,
      keyName: null,
      camelot: null,
      genre: null,
      subGenre: null,
      label: null,
      releaseName: null,
      length: null,
      lengthMs: null,
      publishDate: null,
      price: null,
      exclusive: false,
      hype: false,
      isrc: null,
      slug: null,
      trackUrl: null,
      previewUrl: null,
      previewStartMs: null,
      previewEndMs: null,
      artworkUrl: null,
      pageUrl: context.pageUrl,
      pageTitle: context.pageTitle,
      extractedAt: '2026-08-19T10:00:00.000Z',
      source: 'dom',
    };

    const tracks = uniqueTracks([
      { ...usable, id: 2, title: '', bpm: 130 },
      { ...usable, id: 3, artists: [], bpm: 130 },
      { ...usable, id: 4, bpm: null },
      usable,
    ]);

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({ id: 1, title: 'Keep Me', position: 1 });
  });
});
