import type { ExtractionSnapshot, TrackFilters } from '../types/track';

export const STORAGE_KEYS = {
  snapshot: 'beatportAnalyst.snapshot',
  filters: 'beatportAnalyst.filters',
  refreshToken: 'beatportAnalyst.refreshToken',
} as const;

export type TracksExtractedMessage = {
  type: 'TRACKS_EXTRACTED';
  snapshot: ExtractionSnapshot;
};

export type RequestRefreshMessage = {
  type: 'REQUEST_REFRESH';
};

export type SetFiltersMessage = {
  type: 'SET_FILTERS';
  filters: TrackFilters;
};

export type BeatportAnalystMessage =
  | TracksExtractedMessage
  | RequestRefreshMessage
  | SetFiltersMessage;
