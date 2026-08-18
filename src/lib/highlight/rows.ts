import type { Track } from '../types/track';

const HIGHLIGHT_ATTR = 'data-bp-analyst-match';

function getTrackSlugAndId(track: Track): [string, number] | null {
  if (!track.slug) return null;
  return [track.slug, track.id];
}

export function applyRowHighlights(allTracks: Track[], visibleTracks: Track[]): void {
  const visibleSet = new Set(
    visibleTracks.flatMap((track) => {
      const tuple = getTrackSlugAndId(track);
      return tuple ? [`${tuple[0]}:${tuple[1]}`] : [];
    }),
  );

  const rows = document.querySelectorAll<HTMLElement>('div.row.tracks-table');
  rows.forEach((row) => {
    const link = row.querySelector<HTMLAnchorElement>('a[href*="/track/"]');
    if (!link) return;
    const parts = new URL(link.href).pathname.split('/').filter(Boolean);
    const slug = parts[1];
    const id = Number(parts[2]);
    const key = `${slug}:${id}`;
    const isMatch = visibleSet.has(key);
    const existsInSnapshot = allTracks.some((track) => `${track.slug}:${track.id}` === key);

    if (!existsInSnapshot) return;

    row.toggleAttribute(HIGHLIGHT_ATTR, isMatch);
    row.style.opacity = isMatch ? '1' : '0.42';
    row.style.outline = isMatch ? '1px solid rgba(85, 210, 140, 0.9)' : '';
    row.style.outlineOffset = isMatch ? '-1px' : '';
  });
}
