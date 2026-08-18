export function formatShare(share: number | null): string {
  if (share === null) return '-';
  return `${Math.round(share * 100)}%`;
}

export function formatBpm(value: number | null): string {
  if (value === null) return '-';
  return String(value);
}

export function formatBpmRange(min: number | null, max: number | null): string {
  if (min === null || max === null) return '-';
  return `${formatBpm(min)}–${formatBpm(max)}`;
}

export function coverageLabel(
  trackCount: number,
  listCount?: number | null,
  complete?: boolean,
): string | null {
  if (complete === true) return null;
  if (listCount != null && listCount > trackCount) {
    return `Based on ${trackCount} of ${listCount} tracks`;
  }
  if (complete === false) {
    return `Based on ${trackCount} tracks`;
  }
  return null;
}

export function headerStatus(input: {
  refreshing: boolean;
  showExtractionHelp: boolean;
  hasSnapshot: boolean;
  source?: string;
  trackCount: number;
  visibleCount: number;
  filtersActive: boolean;
}): string {
  if (input.refreshing) return 'Reloading Beatport page…';
  if (input.showExtractionHelp) {
    return 'No tracks could be read from this Beatport page.';
  }
  if (!input.hasSnapshot) return 'Waiting for a Beatport page snapshot.';
  if (input.filtersActive) {
    return `${input.visibleCount} of ${input.trackCount} tracks from ${input.source}`;
  }
  return `${input.trackCount} tracks from ${input.source}`;
}

export function bpmBucketStartLabel(label: string): string {
  return label.replace(/-\d+$/, '');
}

export function bpmBucketRangeLabel(label: string): string {
  return label.replace('-', '–');
}
