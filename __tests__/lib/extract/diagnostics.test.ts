import { describe, expect, it } from 'vitest'
import {
  buildExtractionDiagnostics,
  formatDiagnosticsReport
} from '../../../src/lib/extract/diagnostics'

describe('formatDiagnosticsReport', () => {
  it('includes version, winning source, and per-source counts', () => {
    const diagnostics = buildExtractionDiagnostics(
      [
        {
          source: 'api-payload',
          rawItemCount: 0,
          acceptedCount: 0,
          rejects: {}
        },
        {
          source: 'next-data',
          rawItemCount: 12,
          acceptedCount: 0,
          rejects: { 'invalid-bpm': 10, 'missing-artists': 2 }
        },
        {
          source: 'dom',
          rawItemCount: 4,
          acceptedCount: 0,
          rejects: { 'missing-title': 4 }
        }
      ],
      null
    )

    const report = formatDiagnosticsReport({
      version: '0.1.0',
      pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
      pageTitle: 'Tech House Top 100',
      errorAt: '2026-11-05T10:00:00.000Z',
      diagnostics
    })

    expect(report).toContain('version: 0.1.0')
    expect(report).toContain('winningSource: none')
    expect(report).toContain('api-payload: raw=0 accepted=0')
    expect(report).toContain(
      'next-data: raw=12 accepted=0 rejects={invalid-bpm:10, missing-artists:2}'
    )
    expect(report).toContain('dom: raw=4 accepted=0 rejects={missing-title:4}')
    expect(report).toContain(
      'pageUrl: https://www.beatport.com/genre/tech-house/11/top-100'
    )
  })

  it('handles a missing diagnostics payload', () => {
    const report = formatDiagnosticsReport({
      version: '0.1.0',
      pageUrl: '',
      pageTitle: ''
    })

    expect(report).toContain('version: 0.1.0')
    expect(report).toContain('winningSource: (none)')
    expect(report).toContain('sources: (none recorded)')
  })
})
