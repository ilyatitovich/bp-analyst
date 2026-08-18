import type { Track } from '../types/track';

const CSV_COLUMNS = [
  'position',
  'title',
  'mix',
  'artists',
  'remixers',
  'label',
  'release',
  'genre',
  'subgenre',
  'bpm',
  'key',
  'camelot',
  'length',
  'publish_date',
  'price',
  'exclusive',
  'hype',
  'isrc',
  'track_url',
  'page_url',
] as const;

function escapeCell(value: string | number | boolean | null): string {
  if (value === null) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export function tracksToCsv(tracks: Track[]): string {
  const rows = tracks.map((track) =>
    [
      track.position,
      track.title,
      track.mixName,
      track.artists.map((artist) => artist.name).join('; '),
      track.remixers.map((remixer) => remixer.name).join('; '),
      track.label?.name ?? null,
      track.releaseName,
      track.genre?.name ?? null,
      track.subGenre?.name ?? null,
      track.bpm,
      track.keyName,
      track.camelot,
      track.length,
      track.publishDate,
      track.price,
      track.exclusive,
      track.hype,
      track.isrc,
      track.trackUrl,
      track.pageUrl,
    ]
      .map(escapeCell)
      .join(','),
  );

  return `\uFEFF${CSV_COLUMNS.join(',')}\n${rows.join('\n')}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildCsvFilename(pageUrl: string): string {
  const slug = new URL(pageUrl).pathname.split('/').filter(Boolean).join('-') || 'beatport-page';
  const date = new Date().toISOString().slice(0, 10);
  return `beatport-${slug}-${date}.csv`;
}
