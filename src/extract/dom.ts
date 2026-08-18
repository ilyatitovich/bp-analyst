import { buildSnapshot, type NormalizeContext } from './normalize';
import type { ExtractionSnapshot, Track } from '../types/track';

const TRACK_ROW_SELECTOR = 'div.row.tracks-table';

function parseNames(container: Element | null): { name: string }[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll('a'))
    .map((anchor) => anchor.textContent?.trim() ?? '')
    .filter(Boolean)
    .map((name) => ({ name }));
}

function parseBpmCell(text: string): { bpm: number | null; keyName: string | null } {
  const match = text.trim().match(/(\d{2,3})\s*BPM\s*-\s*(.+)$/i);
  if (!match) {
    return { bpm: null, keyName: null };
  }
  return {
    bpm: Number(match[1]),
    keyName: match[2]?.trim() ?? null,
  };
}

export function extractSnapshotFromDom(context: NormalizeContext): ExtractionSnapshot | null {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(TRACK_ROW_SELECTOR));
  if (!rows.length) return null;

  const tracks: Track[] = rows.flatMap((row, index) => {
    const titleCell = row.querySelector('.cell.title');
    const bpmCell = row.querySelector('.cell.bpm');
    const genreCell = row.querySelector('.cell.genre');
    const labelCell = row.querySelector('.cell.labels');
    const releaseCell = row.querySelector('.cell.release-date');
    const titleLink = titleCell?.querySelector<HTMLAnchorElement>('a[href*="/track/"]');

    const titleText = titleLink?.textContent?.trim();
    if (!titleText) return [];

    const url = titleLink?.href || null;
    const pathParts = url ? new URL(url).pathname.split('/').filter(Boolean) : [];
    const slug = pathParts[1] ?? null;
    const id = pathParts[2] ? Number(pathParts[2]) : Number.NaN;
    if (!Number.isFinite(id)) return [];

    const artistLinks = titleCell?.parentElement?.querySelectorAll('div.artists a') ?? [];
    const bpmValue = parseBpmCell(bpmCell?.textContent ?? '');

    return [
      {
        id,
        position: index + 1,
        title: titleText,
        mixName: '',
        artists: Array.from(artistLinks).map((anchor) => ({ name: anchor.textContent?.trim() ?? '' })).filter((artist) => artist.name),
        remixers: [],
        bpm: bpmValue.bpm,
        keyName: bpmValue.keyName,
        camelot: null,
        genre: genreCell?.textContent?.trim() ? { name: genreCell.textContent.trim() } : null,
        subGenre: null,
        label: labelCell?.textContent?.trim() ? { name: labelCell.textContent.trim() } : null,
        releaseName: null,
        length: row.querySelector('.cell.length')?.textContent?.trim() ?? null,
        lengthMs: null,
        publishDate: releaseCell?.textContent?.trim() ?? null,
        price: row.querySelector('.cell.price')?.textContent?.trim() ?? null,
        exclusive: false,
        hype: false,
        isrc: null,
        slug,
        trackUrl: url,
        pageUrl: context.pageUrl,
        pageTitle: context.pageTitle,
        extractedAt: new Date().toISOString(),
        source: context.source,
      },
    ];
  });

  if (!tracks.length) return null;
  return buildSnapshot(tracks, context);
}
