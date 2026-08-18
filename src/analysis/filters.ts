import { getCompatibleCamelotKeys, resolveCamelot } from './camelot';
import { classifyMixType, isPublishedWithinDays } from './stats';
import type { Track, TrackFilters } from '../types/track';

const BPM_BUCKET_PATTERN = /^(\d+)-(\d+)$/;

export type BpmBucketRange = {
  min: number;
  max: number;
};

function includesText(value: string | null | undefined, query: string): boolean {
  if (!query) return true;
  return (value ?? '').toLowerCase().includes(query.trim().toLowerCase());
}

export function parseBpmBucket(label: string): BpmBucketRange | null {
  const match = label.trim().match(BPM_BUCKET_PATTERN);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
  return { min, max };
}

export function toggleListValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function hasActiveFilters(filters: TrackFilters): boolean {
  return (
    filters.bpmMin !== null ||
    filters.bpmMax !== null ||
    filters.bpmBuckets.length > 0 ||
    filters.camelotKeys.length > 0 ||
    Boolean(filters.compatibleWith) ||
    filters.genreNames.length > 0 ||
    filters.labelNames.length > 0 ||
    Boolean(filters.labelQuery.trim()) ||
    Boolean(filters.titleQuery.trim()) ||
    filters.mixTypes.length > 0 ||
    filters.publishedWithinDays !== null ||
    filters.artistNames.length > 0 ||
    filters.includeExclusiveOnly ||
    filters.includeHypeOnly
  );
}

function matchesBpmBuckets(bpm: number | null, buckets: string[]): boolean {
  if (!buckets.length) return true;
  if (bpm === null) return false;
  return buckets.some((label) => {
    const range = parseBpmBucket(label);
    return range !== null && bpm >= range.min && bpm <= range.max;
  });
}

export function filterTracks(
  tracks: Track[],
  filters: TrackFilters,
  now: Date = new Date(),
): Track[] {
  const compatibleSet = filters.compatibleWith
    ? new Set(getCompatibleCamelotKeys(filters.compatibleWith))
    : null;
  const camelotSet = filters.camelotKeys.length ? new Set(filters.camelotKeys) : null;
  const genreSet = filters.genreNames.length
    ? new Set(filters.genreNames.map((name) => name.toLowerCase()))
    : null;
  const labelSet = filters.labelNames.length
    ? new Set(filters.labelNames.map((name) => name.toLowerCase()))
    : null;
  const artistSet = filters.artistNames.length
    ? new Set(filters.artistNames.map((name) => name.toLowerCase()))
    : null;
  const mixTypeSet = filters.mixTypes.length ? new Set(filters.mixTypes) : null;

  return tracks.filter((track) => {
    if (filters.bpmMin !== null && (track.bpm ?? -Infinity) < filters.bpmMin) return false;
    if (filters.bpmMax !== null && (track.bpm ?? Infinity) > filters.bpmMax) return false;
    if (!matchesBpmBuckets(track.bpm, filters.bpmBuckets)) return false;

    const camelot = resolveCamelot(track.camelot, track.keyName) ?? '';
    if (camelotSet && !camelotSet.has(camelot)) return false;
    if (compatibleSet && !compatibleSet.has(camelot)) return false;
    if (genreSet && !genreSet.has((track.genre?.name ?? '').toLowerCase())) return false;
    if (labelSet && !labelSet.has((track.label?.name ?? '').toLowerCase())) return false;
    if (artistSet) {
      const names = track.artists.map((artist) => artist.name.toLowerCase());
      if (!names.some((name) => artistSet.has(name))) return false;
    }
    if (!includesText(track.label?.name, filters.labelQuery)) return false;

    const combinedTitle = `${track.title} ${track.mixName} ${track.artists.map((artist) => artist.name).join(' ')}`;
    if (!includesText(combinedTitle, filters.titleQuery)) return false;
    if (mixTypeSet && !mixTypeSet.has(classifyMixType(track.mixName))) return false;
    if (
      filters.publishedWithinDays !== null &&
      !isPublishedWithinDays(track.publishDate, now, filters.publishedWithinDays)
    ) {
      return false;
    }
    if (filters.includeExclusiveOnly && !track.exclusive) return false;
    if (filters.includeHypeOnly && !track.hype) return false;

    return true;
  });
}
