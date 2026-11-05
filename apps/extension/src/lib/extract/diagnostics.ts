import type {
  ExtractionDiagnostics,
  ExtractAttempt,
  NormalizeRejectReason,
  TrackSnapshotSource
} from '../types/track'

export function emptyAttempt(source: TrackSnapshotSource): ExtractAttempt {
  return {
    source,
    rawItemCount: 0,
    acceptedCount: 0,
    rejects: {}
  }
}

export function incrementReject(
  rejects: Partial<Record<NormalizeRejectReason, number>>,
  reason: NormalizeRejectReason
): void {
  rejects[reason] = (rejects[reason] ?? 0) + 1
}

export function buildExtractionDiagnostics(
  attempts: ExtractAttempt[],
  winningSource: TrackSnapshotSource | null
): ExtractionDiagnostics {
  return {
    winningSource,
    sources: attempts
  }
}

function formatRejects(
  rejects: Partial<Record<NormalizeRejectReason, number>>
): string {
  const entries = Object.entries(rejects).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number'
  )
  if (!entries.length) return ''
  return ` rejects={${entries
    .map(([reason, count]) => `${reason}:${count}`)
    .join(', ')}}`
}

export type DiagnosticsReportInput = {
  version: string
  pageUrl: string
  pageTitle: string
  extractedAt?: string | undefined
  errorAt?: string | undefined
  trackCount?: number | undefined
  listCount?: number | null | undefined
  complete?: boolean | undefined
  diagnostics?: ExtractionDiagnostics | null | undefined
}

/** Plain-text report for paste into support email / GitHub issues. */
export function formatDiagnosticsReport(input: DiagnosticsReportInput): string {
  const lines = [
    'Beatport Analyst diagnostics',
    `version: ${input.version}`,
    `pageUrl: ${input.pageUrl || '(unknown)'}`,
    `pageTitle: ${input.pageTitle || '(unknown)'}`
  ]

  if (input.extractedAt) lines.push(`extractedAt: ${input.extractedAt}`)
  if (input.errorAt) lines.push(`errorAt: ${input.errorAt}`)
  if (typeof input.trackCount === 'number') {
    lines.push(`trackCount: ${input.trackCount}`)
  }
  if (input.listCount !== undefined) {
    lines.push(`listCount: ${input.listCount ?? 'null'}`)
  }
  if (typeof input.complete === 'boolean') {
    lines.push(`complete: ${input.complete}`)
  }

  const diagnostics = input.diagnostics
  if (!diagnostics) {
    lines.push('winningSource: (none)')
    lines.push('sources: (none recorded)')
    return lines.join('\n')
  }

  lines.push(`winningSource: ${diagnostics.winningSource ?? 'none'}`)
  lines.push('sources:')
  for (const attempt of diagnostics.sources) {
    lines.push(
      `  ${attempt.source}: raw=${attempt.rawItemCount} accepted=${attempt.acceptedCount}${formatRejects(attempt.rejects)}`
    )
  }

  return lines.join('\n')
}
