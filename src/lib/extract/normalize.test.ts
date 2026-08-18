import { describe, expect, it } from 'vitest';
import { normalizeTrack } from './normalize';

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
