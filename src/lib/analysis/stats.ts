import { CAMELOT_KEYS, CAMELOT_TO_SCALE, resolveCamelot, type CamelotKey } from './camelot';
import type { Track } from '../types/track';

export type Bucket = {
  label: string;
  count: number;
};

export const MIX_TYPES = ['Original', 'Extended', 'Radio', 'Remix', 'Other'] as const;
export type MixType = (typeof MIX_TYPES)[number];

export const LENGTH_BANDS = ['<4', '4–6', '6–8', '8+'] as const;
export type LengthBand = (typeof LENGTH_BANDS)[number];

export type TrackStats = {
  count: number;
  bpmMin: number | null;
  bpmMax: number | null;
  bpmMedian: number | null;
  bpmP25: number | null;
  bpmP75: number | null;
  bpmMode: number | null;
  camelotMedian: CamelotKey | null;
  camelotMode: CamelotKey | null;
  exclusiveCount: number;
  exclusiveShare: number | null;
  hypeCount: number;
  hypeShare: number | null;
  freshness7Count: number;
  freshness7Share: number | null;
  freshness30Count: number;
  freshness30Share: number | null;
  mixTypeHistogram: Bucket[];
  lengthHistogram: Bucket[];
  keyConcentration: Bucket[];
  keyConcentrationShare: number | null;
  labelConcentration: Bucket[];
  labelConcentrationShare: number | null;
  artistConcentration: Bucket[];
  artistConcentrationShare: number | null;
  bpmHistogram: Bucket[];
  camelotHistogram: Bucket[];
  scaleHistogram: Bucket[];
  camelotDistribution: Bucket[];
  genreDistribution: Bucket[];
  labelDistribution: Bucket[];
  artistDistribution: Bucket[];
};

export type ComputeTrackStatsOptions = {
  now?: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function utcDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function parsePublishDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (iso) {
    return utcDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const monthFirst = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthFirst) {
    const month = MONTH_INDEX[monthFirst[1].toLowerCase()];
    if (month !== undefined) {
      return utcDate(Number(monthFirst[3]), month, Number(monthFirst[2]));
    }
  }

  const dayFirst = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dayFirst) {
    const month = MONTH_INDEX[dayFirst[2].toLowerCase()];
    if (month !== undefined) {
      return utcDate(Number(dayFirst[3]), month, Number(dayFirst[1]));
    }
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function isPublishedWithinDays(
  publishDate: string | null | undefined,
  now: Date,
  days: number,
): boolean {
  const published = parsePublishDate(publishDate);
  if (!published) return false;
  return published.getTime() >= now.getTime() - days * MS_PER_DAY;
}

export function classifyMixType(mixName: string): MixType {
  const value = mixName.trim().toLowerCase();
  if (!value) return 'Original';
  if (/\bremix(?:es)?\b|\brework\b|\bbootleg\b/.test(value)) return 'Remix';
  if (/\bradio\b/.test(value)) return 'Radio';
  if (/\bextended\b/.test(value)) return 'Extended';
  if (/\boriginal\b/.test(value)) return 'Original';
  return 'Other';
}

export function trackLengthMs(track: Pick<Track, 'lengthMs' | 'length'>): number | null {
  if (typeof track.lengthMs === 'number' && Number.isFinite(track.lengthMs) && track.lengthMs >= 0) {
    return track.lengthMs;
  }
  if (!track.length) return null;
  const parts = track.length.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map(Number);
  if (nums.some((value) => !Number.isFinite(value))) return null;
  if (parts.length === 2) return (nums[0] * 60 + nums[1]) * 1000;
  return (nums[0] * 3600 + nums[1] * 60 + nums[2]) * 1000;
}

function lengthBand(ms: number): LengthBand {
  const minutes = ms / 60_000;
  if (minutes < 4) return '<4';
  if (minutes < 6) return '4–6';
  if (minutes < 8) return '6–8';
  return '8+';
}

function histogram(values: string[], limit = 12): Bucket[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const label = value.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label, count: 1 });
    }
  }

  const buckets = Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );

  return limit > 0 ? buckets.slice(0, limit) : buckets;
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

const CAMELOT_INDEX = new Map(CAMELOT_KEYS.map((key, index) => [key, index]));

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function median(values: number[]): number | null {
  return percentile(values, 50);
}

function share(count: number, total: number): number | null {
  if (total <= 0) return null;
  return count / total;
}

const CONCENTRATION_TOP_N = 5;

function topBuckets(buckets: Bucket[], n: number): Bucket[] {
  return buckets.filter((bucket) => bucket.count > 0).slice(0, n);
}

function pageConcentration(
  tracks: Track[],
  buckets: Bucket[],
  trackMatches: (track: Track, names: Set<string>) => boolean,
): { items: Bucket[]; share: number | null } {
  const items = topBuckets(buckets, CONCENTRATION_TOP_N);
  const names = new Set(items.map((item) => item.label.toLowerCase()));
  const matching = tracks.filter((track) => trackMatches(track, names)).length;
  return { items, share: share(matching, tracks.length) };
}

function countedHistogram(labels: string[], order: readonly string[]): Bucket[] {
  const counts = new Map<string, number>(order.map((label) => [label, 0]));
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return order.map((label) => ({ label, count: counts.get(label) ?? 0 }));
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

function camelotMedian(keys: CamelotKey[]): CamelotKey | null {
  if (!keys.length) return null;
  const sorted = [...keys].sort(
    (a, b) => (CAMELOT_INDEX.get(a) ?? 0) - (CAMELOT_INDEX.get(b) ?? 0),
  );
  const middle = Math.floor((sorted.length - 1) / 2);
  return sorted[middle];
}

function camelotMode(keys: CamelotKey[]): CamelotKey | null {
  if (!keys.length) return null;
  const counts = new Map<CamelotKey, number>();
  let bestValue = keys[0];
  let bestCount = 0;

  for (const key of keys) {
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count > bestCount) {
      bestValue = key;
      bestCount = count;
    }
  }

  return bestValue;
}

export function computeTrackStats(
  tracks: Track[],
  options: ComputeTrackStatsOptions = {},
): TrackStats {
  const now = options.now ?? new Date();
  const bpms = tracks.flatMap((track) => (track.bpm === null ? [] : [track.bpm]));
  const artists = tracks.flatMap((track) => track.artists.map((artist) => artist.name));
  const camelotKeys = tracks.flatMap((track) => {
    const camelot = resolveCamelot(track.camelot, track.keyName);
    return camelot ? [camelot] : [];
  });
  const keyHistograms = createKeyHistograms(tracks);
  const exclusiveCount = tracks.filter((track) => track.exclusive).length;
  const hypeCount = tracks.filter((track) => track.hype).length;
  const freshness7Count = tracks.filter((track) =>
    isPublishedWithinDays(track.publishDate, now, 7),
  ).length;
  const freshness30Count = tracks.filter((track) =>
    isPublishedWithinDays(track.publishDate, now, 30),
  ).length;
  const mixLabels = tracks.map((track) => classifyMixType(track.mixName));
  const lengthLabels = tracks.flatMap((track) => {
    const ms = trackLengthMs(track);
    return ms === null ? [] : [lengthBand(ms)];
  });
  const keyedTotal = camelotKeys.length;
  const topKeys = [...keyHistograms.camelot]
    .filter((bucket) => bucket.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 3);
  const top3Count = topKeys.reduce((sum, bucket) => sum + bucket.count, 0);
  const labelDistribution = histogram(
    tracks.flatMap((track) => (track.label?.name ? [track.label.name] : [])),
    0,
  );
  const artistDistribution = histogram(artists, 0);
  const labels = pageConcentration(tracks, labelDistribution, (track, names) => {
    const name = track.label?.name?.trim();
    return Boolean(name && names.has(name.toLowerCase()));
  });
  const artistNames = pageConcentration(tracks, artistDistribution, (track, names) =>
    track.artists.some((artist) => names.has(artist.name.trim().toLowerCase())),
  );

  return {
    count: tracks.length,
    bpmMin: bpms.length ? Math.min(...bpms) : null,
    bpmMax: bpms.length ? Math.max(...bpms) : null,
    bpmMedian: median(bpms),
    bpmP25: percentile(bpms, 25),
    bpmP75: percentile(bpms, 75),
    bpmMode: mode(bpms),
    camelotMedian: camelotMedian(camelotKeys),
    camelotMode: camelotMode(camelotKeys),
    exclusiveCount,
    exclusiveShare: share(exclusiveCount, tracks.length),
    hypeCount,
    hypeShare: share(hypeCount, tracks.length),
    freshness7Count,
    freshness7Share: share(freshness7Count, tracks.length),
    freshness30Count,
    freshness30Share: share(freshness30Count, tracks.length),
    mixTypeHistogram: countedHistogram(mixLabels, MIX_TYPES),
    lengthHistogram: countedHistogram(lengthLabels, LENGTH_BANDS),
    keyConcentration: topKeys,
    keyConcentrationShare: share(top3Count, keyedTotal),
    labelConcentration: labels.items,
    labelConcentrationShare: labels.share,
    artistConcentration: artistNames.items,
    artistConcentrationShare: artistNames.share,
    bpmHistogram: createBpmHistogram(bpms),
    camelotHistogram: keyHistograms.camelot,
    scaleHistogram: keyHistograms.scale,
    camelotDistribution: keyHistograms.camelot.filter((bucket) => bucket.count > 0),
    genreDistribution: histogram(tracks.flatMap((track) => (track.genre?.name ? [track.genre.name] : []))),
    labelDistribution,
    artistDistribution,
  };
}
