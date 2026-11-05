import type { ExtractionSnapshot } from '../types/track'

export const STORAGE_KEYS = {
  keyNotation: 'beatportAnalyst.keyNotation'
} as const

export type ExtractionErrorState = {
  pageUrl: string
  pageTitle: string
  at: string
}

export type KeyNotation = 'scale' | 'camelot'

export const DEFAULT_KEY_NOTATION: KeyNotation = 'scale'

export type TracksExtractedMessage = {
  type: 'TRACKS_EXTRACTED'
  snapshot: ExtractionSnapshot
}

export type RequestRefreshMessage = {
  type: 'REQUEST_REFRESH'
  force?: boolean
  auto?: boolean
}

/** Background → content script: re-extract from the in-tab payload cache. */
export type RequestTabCaptureMessage = {
  type: 'REQUEST_TAB_CAPTURE'
}

export type RequestTabCaptureResponse = {
  ok: true
  hadPayload: boolean
  trackCount: number
}

export type ExtractionFailedMessage = {
  type: 'EXTRACTION_FAILED'
  pageUrl: string
  pageTitle: string
}

/** Content script → background: this tab is Beatport; enable the panel without `tabs`. */
export type ContentHelloMessage = {
  type: 'CONTENT_HELLO'
}

export type BeatportAnalystMessage =
  | TracksExtractedMessage
  | RequestRefreshMessage
  | RequestTabCaptureMessage
  | ExtractionFailedMessage
  | ContentHelloMessage
