import type { ExtractionSnapshot } from '../types/track';

export const STORAGE_KEYS = {
  snapshot: 'beatportAnalyst.snapshot',
  keyNotation: 'beatportAnalyst.keyNotation',
  refreshToken: 'beatportAnalyst.refreshToken',
  extractionError: 'beatportAnalyst.extractionError',
} as const;

export type ExtractionErrorState = {
  pageUrl: string;
  pageTitle: string;
  at: string;
};

export type KeyNotation = 'camelot' | 'scale';

export type TracksExtractedMessage = {
  type: 'TRACKS_EXTRACTED';
  snapshot: ExtractionSnapshot;
};

export type RequestRefreshMessage = {
  type: 'REQUEST_REFRESH';
  force?: boolean;
};

export type ExtractionFailedMessage = {
  type: 'EXTRACTION_FAILED';
  pageUrl: string;
  pageTitle: string;
};

export type BeatportAnalystMessage =
  | TracksExtractedMessage
  | RequestRefreshMessage
  | ExtractionFailedMessage;
