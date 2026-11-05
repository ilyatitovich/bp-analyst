import type { ExtractionSnapshot } from '../types/track';

export const STORAGE_KEYS = {
  keyNotation: 'beatportAnalyst.keyNotation',
  refreshToken: 'beatportAnalyst.refreshToken',
} as const;

export type ExtractionErrorState = {
  pageUrl: string;
  pageTitle: string;
  at: string;
};

export type KeyNotation = 'scale' | 'camelot';

export const DEFAULT_KEY_NOTATION: KeyNotation = 'scale';

export type TracksExtractedMessage = {
  type: 'TRACKS_EXTRACTED';
  snapshot: ExtractionSnapshot;
};

export type RequestRefreshMessage = {
  type: 'REQUEST_REFRESH';
  force?: boolean;
  auto?: boolean;
};

/** Background → content script: re-extract from the in-tab payload cache. */
export type RequestTabCaptureMessage = {
  type: 'REQUEST_TAB_CAPTURE';
};

export type RequestTabCaptureResponse = {
  ok: true;
  hadPayload: boolean;
  trackCount: number;
};

export type ExtractionFailedMessage = {
  type: 'EXTRACTION_FAILED';
  pageUrl: string;
  pageTitle: string;
};

export type BeatportAnalystMessage =
  | TracksExtractedMessage
  | RequestRefreshMessage
  | RequestTabCaptureMessage
  | ExtractionFailedMessage;
