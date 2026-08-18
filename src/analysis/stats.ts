import { CAMELOT_KEYS, CAMELOT_TO_SCALE, resolveCamelot } from './camelot';
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
  camelotHistogram: Bucket[];
  scaleHistogram: Bucket[];
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

const BPM_BUCKET_SIZE = 5;
const BPM_HISTOGRAM_MIN_BUCKETS = 8;
const BPM_AXIS_MIN = 60;
const BPM_AXIS_MAX = 200;

function alignBpmBucket(bpm: number): number {
  return Math.floor(bpm / BPM_BUCKET_SIZE) * BPM_BUCKET_SIZE;
}

function createBpmHistogram(bpms: number[]): Bucket[] {
  if (!bpms.length) return [];

  const dataStart = alignBpmBucket(Math.min(...bpms));
  const dataEnd = alignBpmBucket(Math.max(...bpms));
  const dataBuckets = (dataEnd - dataStart) / BPM_BUCKET_SIZE + 1;
  const extraBuckets = Math.max(0, BPM_HISTOGRAM_MIN_BUCKETS - dataBuckets);
  const padLeftBuckets = Math.floor(extraBuckets / 2);
  const padRightBuckets = extraBuckets - padLeftBuckets;
  const padLeft = padLeftBuckets * BPM_BUCKET_SIZE;
  const padRight = padRightBuckets * BPM_BUCKET_SIZE;

  const start = Math.min(dataStart, Math.max(BPM_AXIS_MIN, dataStart - padLeft));
  const end = Math.max(dataEnd, Math.min(BPM_AXIS_MAX, dataEnd + padRight));
  const counts = new Map<number, number>();

  for (let bucket = start; bucket <= end; bucket += BPM_BUCKET_SIZE) {
    counts.set(bucket, 0);
  }

  for (const bpm of bpms) {
    const bucket = Math.min(end, Math.max(start, alignBpmBucket(bpm)));
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({
      label: `${bucket}-${bucket + BPM_BUCKET_SIZE - 1}`,
      count,
    }));
}

function createKeyHistograms(tracks: Track[]): { camelot: Bucket[]; scale: Bucket[] } {
  const counts = new Map<string, number>();
  for (const key of CAMELOT_KEYS) {
    counts.set(key, 0);
  }

  for (const track of tracks) {
    const camelot = resolveCamelot(track.camelot, track.keyName);
    if (!camelot) continue;
    counts.set(camelot, (counts.get(camelot) ?? 0) + 1);
  }

  return {
    camelot: CAMELOT_KEYS.map((key) => ({ label: key, count: counts.get(key) ?? 0 })),
    scale: CAMELOT_KEYS.map((key) => ({ label: CAMELOT_TO_SCALE[key], count: counts.get(key) ?? 0 })),
  };
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
  const keyHistograms = createKeyHistograms(tracks);

  return {
    count: tracks.length,
    bpmMin: bpms.length ? Math.min(...bpms) : null,
    bpmMax: bpms.length ? Math.max(...bpms) : null,
    bpmMedian: median(bpms),
    bpmMode: mode(bpms),
    bpmHistogram: createBpmHistogram(bpms),
    camelotHistogram: keyHistograms.camelot,
    scaleHistogram: keyHistograms.scale,
    camelotDistribution: keyHistograms.camelot.filter((bucket) => bucket.count > 0),
    genreDistribution: histogram(tracks.flatMap((track) => (track.genre?.name ? [track.genre.name] : []))),
    labelDistribution: histogram(tracks.flatMap((track) => (track.label?.name ? [track.label.name] : []))),
    artistDistribution: histogram(artists),
  };
}
