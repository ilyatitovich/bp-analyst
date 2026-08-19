export type BeatportScopedFacet = 'artist' | 'label' | 'genre';

const SCOPED_FACET_PATH = /^\/(artist|label|genre)\//;

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
