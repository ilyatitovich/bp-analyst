import { describe, expect, it } from 'vitest';
import type { Track } from '../../../src/lib/types/track';
import {
  beatportCatalogUrlFromTracks,
  beatportEntityUrl,
  scopedFacetFromPageUrl,
} from '../../../src/lib/utils/page';

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

describe('beatportEntityUrl', () => {
  it('builds artist and label catalog urls', () => {
    expect(beatportEntityUrl('artist', { id: 498126, slug: 'chris-stussy' })).toBe(
      'https://www.beatport.com/artist/chris-stussy/498126',
    );
    expect(beatportEntityUrl('label', { id: 26261, slug: 'hot-creations' })).toBe(
      'https://www.beatport.com/label/hot-creations/26261',
    );
  });

  it('returns null without an id or slug', () => {
    expect(beatportEntityUrl('label', { id: 1, slug: null })).toBeNull();
    expect(beatportEntityUrl('artist', { slug: 'chris-stussy' })).toBeNull();
    expect(beatportEntityUrl('artist', null)).toBeNull();
  });
});

describe('beatportCatalogUrlFromTracks', () => {
  const tracks = [
    {
      artists: [{ id: 498126, name: 'Chris Stussy', slug: 'chris-stussy' }],
      label: { id: 26261, name: 'Hot Creations', slug: 'hot-creations' },
    },
    {
      artists: [{ name: 'No Slug' }],
      label: { id: 1, name: 'Missing Slug', slug: null },
    },
  ] as Track[];

  it('resolves concentration names to catalog urls', () => {
    expect(beatportCatalogUrlFromTracks(tracks, 'artist', 'chris stussy')).toBe(
      'https://www.beatport.com/artist/chris-stussy/498126',
    );
    expect(beatportCatalogUrlFromTracks(tracks, 'label', 'Hot Creations')).toBe(
      'https://www.beatport.com/label/hot-creations/26261',
    );
  });

  it('skips names that cannot be linked', () => {
    expect(beatportCatalogUrlFromTracks(tracks, 'artist', 'No Slug')).toBeNull();
    expect(beatportCatalogUrlFromTracks(tracks, 'label', 'Unknown')).toBeNull();
  });
});
