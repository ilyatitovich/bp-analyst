import type { Track } from '../types/track';

export type BeatportScopedFacet = 'artist' | 'label' | 'genre';

const SCOPED_FACET_PATH = /^\/(artist|label|genre)\//;
const BEATPORT_ORIGIN = 'https://www.beatport.com';

export function scopedFacetFromPageUrl(
  pageUrl: string | null | undefined,
): BeatportScopedFacet | null {
  if (!pageUrl) return null;

  try {
    const { pathname } = new URL(pageUrl);
    const match = pathname.toLowerCase().match(SCOPED_FACET_PATH);
    return match ? (match[1] as BeatportScopedFacet) : null;
  } catch {
    return null;
  }
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function beatportEntityUrl(
  kind: 'artist' | 'label',
  entity: { id?: number; slug?: string | null } | null | undefined,
): string | null {
  const slug = entity?.slug?.trim();
  if (!entity?.id || !slug) return null;
  return `${BEATPORT_ORIGIN}/${kind}/${slug}/${entity.id}`;
}

export function beatportCatalogUrlFromTracks(
  tracks: Track[],
  kind: 'artist' | 'label',
  name: string,
): string | null {
  for (const track of tracks) {
    if (kind === 'label') {
      if (track.label && sameName(track.label.name, name)) {
        return beatportEntityUrl('label', track.label);
      }
      continue;
    }

    const artist = track.artists.find((person) => sameName(person.name, name));
    if (artist) return beatportEntityUrl('artist', artist);
  }

  return null;
}
