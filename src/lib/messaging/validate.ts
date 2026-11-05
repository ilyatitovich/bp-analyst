import type {
  ExtractionDiagnostics,
  ExtractionSnapshot,
  TrackSnapshotSource
} from '../types/track'
import type {
  BeatportAnalystMessage,
  ContentHelloMessage,
  ExtractionFailedMessage,
  RequestRefreshMessage,
  RequestTabCaptureMessage,
  TracksExtractedMessage
} from './protocol'

const SNAPSHOT_SOURCES = new Set<TrackSnapshotSource>([
  'next-data',
  'api-payload',
  'dom'
])

export function isExtensionSender(
  sender: { id?: string },
  extensionId: string | undefined
): boolean {
  return Boolean(extensionId && sender.id === extensionId)
}

function isExtractAttempt(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const attempt = value as Record<string, unknown>
  return (
    typeof attempt.source === 'string' &&
    SNAPSHOT_SOURCES.has(attempt.source as TrackSnapshotSource) &&
    typeof attempt.rawItemCount === 'number' &&
    Number.isFinite(attempt.rawItemCount) &&
    typeof attempt.acceptedCount === 'number' &&
    Number.isFinite(attempt.acceptedCount) &&
    attempt.rejects !== null &&
    typeof attempt.rejects === 'object' &&
    !Array.isArray(attempt.rejects)
  )
}

function isExtractionDiagnostics(
  value: unknown
): value is ExtractionDiagnostics {
  if (!value || typeof value !== 'object') return false
  const diagnostics = value as Record<string, unknown>
  const winning = diagnostics.winningSource
  const winningOk =
    winning === null ||
    (typeof winning === 'string' &&
      SNAPSHOT_SOURCES.has(winning as TrackSnapshotSource))
  return (
    winningOk &&
    Array.isArray(diagnostics.sources) &&
    diagnostics.sources.every(isExtractAttempt)
  )
}

export function isExtractionSnapshot(
  value: unknown
): value is ExtractionSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Record<string, unknown>
  if (!(
    typeof snapshot.pageUrl === 'string' &&
    typeof snapshot.pageTitle === 'string' &&
    typeof snapshot.extractedAt === 'string' &&
    typeof snapshot.source === 'string' &&
    SNAPSHOT_SOURCES.has(snapshot.source as TrackSnapshotSource) &&
    typeof snapshot.trackCount === 'number' &&
    Number.isFinite(snapshot.trackCount) &&
    Array.isArray(snapshot.tracks) &&
    snapshot.tracks.every(track => track !== null && typeof track === 'object')
  )) {
    return false
  }
  if (
    snapshot.diagnostics !== undefined &&
    !isExtractionDiagnostics(snapshot.diagnostics)
  ) {
    return false
  }
  return true
}

function asTracksExtractedMessage(
  message: Record<string, unknown>
): TracksExtractedMessage | null {
  if (!isExtractionSnapshot(message.snapshot)) return null
  return { type: 'TRACKS_EXTRACTED', snapshot: message.snapshot }
}

function asExtractionFailedMessage(
  message: Record<string, unknown>
): ExtractionFailedMessage | null {
  if (
    typeof message.pageUrl !== 'string' ||
    typeof message.pageTitle !== 'string'
  ) {
    return null
  }
  if (
    message.diagnostics !== undefined &&
    !isExtractionDiagnostics(message.diagnostics)
  ) {
    return null
  }
  const parsed: ExtractionFailedMessage = {
    type: 'EXTRACTION_FAILED',
    pageUrl: message.pageUrl,
    pageTitle: message.pageTitle
  }
  if (message.diagnostics !== undefined) {
    parsed.diagnostics = message.diagnostics
  }
  return parsed
}

function asRequestRefreshMessage(
  message: Record<string, unknown>
): RequestRefreshMessage | null {
  const parsed: RequestRefreshMessage = { type: 'REQUEST_REFRESH' }
  if (message.force !== undefined) {
    if (typeof message.force !== 'boolean') return null
    parsed.force = message.force
  }
  if (message.auto !== undefined) {
    if (typeof message.auto !== 'boolean') return null
    parsed.auto = message.auto
  }
  return parsed
}

function asRequestTabCaptureMessage(): RequestTabCaptureMessage {
  return { type: 'REQUEST_TAB_CAPTURE' }
}

function asContentHelloMessage(): ContentHelloMessage {
  return { type: 'CONTENT_HELLO' }
}

/** Narrow an untrusted runtime message to the typed protocol, or null. */
export function parseBeatportAnalystMessage(
  message: unknown
): BeatportAnalystMessage | null {
  if (!message || typeof message !== 'object') return null
  const candidate = message as Record<string, unknown>
  if (typeof candidate.type !== 'string') return null

  switch (candidate.type) {
    case 'TRACKS_EXTRACTED':
      return asTracksExtractedMessage(candidate)
    case 'EXTRACTION_FAILED':
      return asExtractionFailedMessage(candidate)
    case 'REQUEST_REFRESH':
      return asRequestRefreshMessage(candidate)
    case 'REQUEST_TAB_CAPTURE':
      return asRequestTabCaptureMessage()
    case 'CONTENT_HELLO':
      return asContentHelloMessage()
    default:
      return null
  }
}
