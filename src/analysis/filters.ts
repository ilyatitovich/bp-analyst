import { getCompatibleCamelotKeys } from './camelot';
import type { Track, TrackFilters } from '../types/track';

function includesText(value: string | null | undefined, query: string): boolean {
  if (!query) return true;
  return (value ?? '').toLowerCase().includes(query.trim().toLowerCase());
}

export function filterTracks(tracks: Track[], filters: TrackFilters): Track[] {
  const compatibleSet = filters.compatibleWith
    ? new Set(getCompatibleCamelotKeys(filters.compatibleWith))
    : null;
  const camelotSet = filters.camelotKeys.length ? new Set(filters.camelotKeys) : null;
  const genreSet = filters.genreNames.length ? new Set(filters.genreNames) : null;

  return tracks.filter((track) => {
    if (filters.bpmMin !== null && (track.bpm ?? -Infinity) < filters.bpmMin) return false;
    if (filters.bpmMax !== null && (track.bpm ?? Infinity) > filters.bpmMax) return false;
    if (camelotSet && !camelotSet.has(track.camelot ?? '')) return false;
    if (compatibleSet && !compatibleSet.has(track.camelot ?? '')) return false;
    if (genreSet && !genreSet.has(track.genre?.name ?? '')) return false;
    if (!includesText(track.label?.name, filters.labelQuery)) return false;

    const combinedTitle = `${track.title} ${track.mixName} ${track.artists.map((artist) => artist.name).join(' ')}`;
    if (!includesText(combinedTitle, filters.titleQuery)) return false;
    if (filters.includeExclusiveOnly && !track.exclusive) return false;
    if (filters.includeHypeOnly && !track.hype) return false;

    return true;
  });
}
