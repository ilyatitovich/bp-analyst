import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { formatDiagnosticsReport } from '../../lib/extract/diagnostics'
import type { ExtractionDiagnostics } from '../../lib/types/track'
import { copyTextToClipboard } from '../../lib/utils/clipboard'
import { SupportContact } from './SupportContact'

type ExtractionHelpCardProps = {
  pageUrl: string
  pageTitle: string
  extractedAt?: string | undefined
  errorAt?: string | undefined
  trackCount?: number | undefined
  listCount?: number | null | undefined
  complete?: boolean | undefined
  diagnostics?: ExtractionDiagnostics | null | undefined
}

export function ExtractionHelpCard({
  pageUrl,
  pageTitle,
  extractedAt,
  errorAt,
  trackCount,
  listCount,
  complete,
  diagnostics
}: ExtractionHelpCardProps) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | null>(null)

  const report = useMemo(() => {
    const version = browser.runtime.getManifest().version
    return formatDiagnosticsReport({
      version,
      pageUrl,
      pageTitle,
      extractedAt,
      errorAt,
      trackCount,
      listCount,
      complete,
      diagnostics
    })
  }, [
    pageUrl,
    pageTitle,
    extractedAt,
    errorAt,
    trackCount,
    listCount,
    complete,
    diagnostics
  ])

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current)
      }
    }
  }, [])

  const copyDiagnostics = useCallback(async () => {
    try {
      await copyTextToClipboard(report)
      setCopied(true)
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current)
      }
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [report])

  return (
    <section className="panel-card support-card" role="status">
      <h3>Couldn't read tracks from this page</h3>
      <p>
        If this is a chart, search, or release list, Beatport may have changed
        their layout. Email me or open a GitHub issue so I can update the
        extension:
      </p>
      <SupportContact />
      <div className="diagnostics-block">
        <p>
          Include this diagnostics report when you write in — it shows which
          sources we tried and why rows were dropped:
        </p>
        <pre className="diagnostics-preview" tabIndex={0}>
          {report}
        </pre>
        <button
          type="button"
          className="copy-email-btn"
          onClick={() => void copyDiagnostics()}
          aria-label={
            copied ? 'Diagnostics copied' : 'Copy diagnostics to clipboard'
          }
        >
          {copied ? 'Copied' : 'Copy diagnostics'}
        </button>
        <span className="visually-hidden" aria-live="polite">
          {copied ? 'Diagnostics copied to clipboard' : ''}
        </span>
      </div>
    </section>
  )
}
