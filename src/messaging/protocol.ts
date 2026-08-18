import type { ExtractionSnapshot } from '../types/track';

export const STORAGE_KEYS = {
  snapshot: 'beatportAnalyst.snapshot',
  keyNotation: 'beatportAnalyst.keyNotation',
  refreshToken: 'beatportAnalyst.refreshToken',
} as const;

export type KeyNotation = 'camelot' | 'scale';

export type TracksExtractedMessage = {
  type: 'TRACKS_EXTRACTED';
  snapshot: ExtractionSnapshot;
};

export type RequestRefreshMessage = {
  type: 'REQUEST_REFRESH';
  force?: boolean;
};

export type BeatportAnalystMessage = TracksExtractedMessage | RequestRefreshMessage;
