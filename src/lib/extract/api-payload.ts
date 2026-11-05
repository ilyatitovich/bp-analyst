import { readCatalogCoverage } from './coverage'
import { emptyAttempt } from './diagnostics'
import {
  buildSnapshot,
  normalizeRawItems,
  type NormalizeContext
} from './normalize'
import type { ExtractResult } from '../types/track'

type ApiPayload = {
  results?: unknown[]
  pages?: Array<{ results?: unknown[] }>
}

function collectPayloadResults(payload: ApiPayload): unknown[] {
  if (Array.isArray(payload.pages)) {
    return payload.pages.flatMap(page =>
      Array.isArray(page.results) ? page.results : []
    )
  }
  return Array.isArray(payload.results) ? payload.results : []
}

export function extractSnapshotFromApiPayload(
  payload: unknown,
  context: NormalizeContext
): ExtractResult {
  if (!payload || typeof payload !== 'object') {
    return { snapshot: null, attempt: emptyAttempt(context.source) }
  }

  const results = collectPayloadResults(payload as ApiPayload)
  const { tracks, attempt } = normalizeRawItems(results, context)

  if (!tracks.length) {
    return { snapshot: null, attempt }
  }

  const snapshot = buildSnapshot(tracks, context)
  const coverage = readCatalogCoverage(payload, snapshot.trackCount)
  if (!coverage) return { snapshot, attempt }

  snapshot.listCount = coverage.listCount
  snapshot.complete = coverage.complete
  return { snapshot, attempt }
}
