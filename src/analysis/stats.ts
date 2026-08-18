import type { Track } from '../types/track';

export type Bucket = {
  label: string;
  count: number;
};

export type TrackStats = {
  count: number;
  bpmMin: number | null;
  bpmMax: number | null;
  bpmMedian: number | null;
  bpmMode: number | null;
  bpmHistogram: Bucket[];
  camelotDistribution: Bucket[];
  genreDistribution: Bucket[];
  labelDistribution: Bucket[];
  artistDistribution: Bucket[];
};

function histogram(values: string[], limit = 12): Bucket[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function createBpmHistogram(bpms: number[]): Bucket[] {
  if (!bpms.length) return [];
  const counts = new Map<number, number>();
  for (const bpm of bpms) {
    const bucket = Math.floor(bpm / 2) * 2;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({
      label: `${bucket}-${bucket + 1}`,
      count,
    }));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function mode(values: number[]): number | null {
  if (!values.length) return null;
  const counts = new Map<number, number>();
  let bestValue = values[0];
  let bestCount = 0;

  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) {
      bestValue = value;
      bestCount = count;
    }
  }

  return bestValue;
}

export function computeTrackStats(tracks: Track[]): TrackStats {
  const bpms = tracks.flatMap((track) => (track.bpm === null ? [] : [track.bpm]));
  const artists = tracks.flatMap((track) => track.artists.map((artist) => artist.name));

  return {
    count: tracks.length,
    bpmMin: bpms.length ? Math.min(...bpms) : null,
    bpmMax: bpms.length ? Math.max(...bpms) : null,
    bpmMedian: median(bpms),
    bpmMode: mode(bpms),
    bpmHistogram: createBpmHistogram(bpms),
    camelotDistribution: histogram(tracks.flatMap((track) => (track.camelot ? [track.camelot] : []))),
    genreDistribution: histogram(tracks.flatMap((track) => (track.genre?.name ? [track.genre.name] : []))),
    labelDistribution: histogram(tracks.flatMap((track) => (track.label?.name ? [track.label.name] : []))),
    artistDistribution: histogram(artists),
  };
}
