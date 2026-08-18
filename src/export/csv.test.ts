import { describe, expect, it } from 'vitest';
import { buildCsvFilename, tracksToCsv } from './csv';
import type { Track } from '../types/track';

const track: Track = {
  id: 1,
  position: 1,
  title: 'Reason, Why',
  mixName: 'Extended Mix',
  artists: [{ name: 'Artist One' }, { name: 'Artist Two' }],
  remixers: [],
  bpm: 128,
  keyName: 'A Minor',
  camelot: '8A',
  genre: { name: 'Melodic House & Techno' },
  subGenre: null,
  label: { name: 'Label' },
  releaseName: 'Release',
  length: '6:01',
  lengthMs: 361000,
  publishDate: '2026-08-18',
  price: '$1.69',
  exclusive: false,
  hype: true,
  isrc: 'ABC123',
  slug: 'reason-why',
  trackUrl: 'https://www.beatport.com/track/reason-why/1',
  previewUrl: null,
  previewStartMs: null,
  previewEndMs: null,
  artworkUrl: null,
  pageUrl: 'https://www.beatport.com/genre/melodic-house-techno/90/top-100',
  pageTitle: 'Beatport',
  extractedAt: '2026-08-18T08:00:00.000Z',
  source: 'next-data',
};

describe('tracksToCsv', () => {
  it('serializes rows with escaping and bom', () => {
    const csv = tracksToCsv([track]);
    expect(csv.startsWith('\uFEFFposition,title')).toBe(true);
    expect(csv).toContain('"Reason, Why"');
    expect(csv).toContain('Artist One; Artist Two');
  });

  it('builds a descriptive filename', () => {
    expect(buildCsvFilename(track.pageUrl)).toMatch(/^beatport-genre-melodic-house-techno-90-top-100-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
