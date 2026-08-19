import { describe, expect, it } from 'vitest';
import { scopedFacetFromPageUrl } from './page';

describe('scopedFacetFromPageUrl', () => {
  it('detects artist, label, and genre entity pages', () => {
    expect(
      scopedFacetFromPageUrl('https://www.beatport.com/artist/chris-stussy/498126'),
    ).toBe('artist');
    expect(
      scopedFacetFromPageUrl('https://www.beatport.com/label/hot-creations/26261/tracks'),
    ).toBe('label');
    expect(
      scopedFacetFromPageUrl(
        'https://www.beatport.com/genre/tech-house/11/top-100',
      ),
    ).toBe('genre');
  });

  it('ignores listing pages and other Beatport routes', () => {
    expect(scopedFacetFromPageUrl('https://www.beatport.com/artists')).toBeNull();
    expect(scopedFacetFromPageUrl('https://www.beatport.com/labels')).toBeNull();
    expect(scopedFacetFromPageUrl('https://www.beatport.com/genres')).toBeNull();
    expect(
      scopedFacetFromPageUrl('https://www.beatport.com/chart/top-100/123'),
    ).toBeNull();
  });

  it('returns null for missing or invalid urls', () => {
    expect(scopedFacetFromPageUrl(null)).toBeNull();
    expect(scopedFacetFromPageUrl(undefined)).toBeNull();
    expect(scopedFacetFromPageUrl('not-a-url')).toBeNull();
  });
});
