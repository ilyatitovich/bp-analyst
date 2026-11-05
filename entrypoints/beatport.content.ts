import { browser } from 'wxt/browser'
import { extractSnapshotFromApiPayload } from '../src/lib/extract/api-payload'
import {
  CAPTURE_TIMING,
  createCaptureLifecycle
} from '../src/lib/extract/capture-lifecycle'
import {
  buildExtractionDiagnostics,
  emptyAttempt
} from '../src/lib/extract/diagnostics'
import { extractSnapshotFromDom } from '../src/lib/extract/dom'
import { extractSnapshotFromNextData } from '../src/lib/extract/next-data'
import { mergeSnapshots, pickLargestSnapshot } from '../src/lib/extract/merge'
import { type ExtractionSnapshot } from '../src/lib/types/track'
import { debugLog, loadDebugLoggingFlag } from '../src/lib/utils/debug'

const PAYLOAD_EVENT = 'bp-analyst:payload'
const LOCATION_EVENT = 'bp-analyst:location-change'

let currentSnapshot: ExtractionSnapshot | null = null
let latestPayload: unknown
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let observer: MutationObserver | null = null
let lifecycle: ReturnType<typeof createCaptureLifecycle> | null = null

function getLifecycle() {
  if (!lifecycle) {
    throw new Error('Capture lifecycle is not initialized')
  }
  return lifecycle
}

function getContext(source: ExtractionSnapshot['source']) {
  return {
    pageUrl: location.href,
    pageTitle: document.title,
    source
  }
}

function observeDom(): void {
  if (!observer) {
    observer = new MutationObserver(() => {
      scheduleExtraction(undefined, false, false)
    })
  }
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
}

function armCapture(): void {
  getLifecycle().arm(location.href)
  observeDom()
}

async function publishSnapshot(
  snapshot: ExtractionSnapshot | null,
  diagnostics: ExtractionSnapshot['diagnostics']
): Promise<void> {
  const capture = getLifecycle()
  try {
    if (!snapshot) {
      capture.scheduleFailure(() => {
        void browser.runtime
          .sendMessage({
            type: 'EXTRACTION_FAILED',
            pageUrl: location.href,
            pageTitle: document.title,
            diagnostics: diagnostics ?? undefined
          })
          .catch(() => {
            capture.setFailurePublished(false)
          })
      })
      return
    }

    capture.clearFailure()
    currentSnapshot = snapshot
    await browser.runtime.sendMessage({
      type: 'TRACKS_EXTRACTED',
      snapshot
    })
  } catch {
    // Background or panel may not be listening yet.
  }
}

async function extractAndPublish(
  payload?: unknown,
  reset = false
): Promise<void> {
  const capture = getLifecycle()
  if (!capture.isArmed()) return

  if (reset) {
    currentSnapshot = null
    capture.clearFailure()
  }

  const api = payload
    ? extractSnapshotFromApiPayload(payload, getContext('api-payload'))
    : { snapshot: null, attempt: emptyAttempt('api-payload') }
  const next = extractSnapshotFromNextData(getContext('next-data'))
  const dom = extractSnapshotFromDom(getContext('dom'))

  const incoming = pickLargestSnapshot(
    api.snapshot,
    next.snapshot,
    dom.snapshot
  )
  const snapshot = mergeSnapshots(currentSnapshot, incoming)
  const diagnostics = buildExtractionDiagnostics(
    [api.attempt, next.attempt, dom.attempt],
    snapshot?.source ?? null
  )

  if (snapshot) {
    snapshot.diagnostics = diagnostics
  }

  debugLog('extraction attempt', {
    winningSource: diagnostics.winningSource,
    trackCount: snapshot?.trackCount ?? 0,
    sources: diagnostics.sources
  })

  await publishSnapshot(snapshot, diagnostics)
}

function scheduleExtraction(
  payload?: unknown,
  reset = false,
  extendSettle = true
): void {
  const capture = getLifecycle()
  if (!capture.isArmed()) return
  if (extendSettle) capture.bumpSettle()
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    if (!capture.isArmed()) return
    void extractAndPublish(payload, reset)
  }, CAPTURE_TIMING.extractDebounceMs)
}

async function captureNow(): Promise<void> {
  armCapture()
  await extractAndPublish(latestPayload, true)
}

function announceTab(): void {
  void browser.runtime.sendMessage({ type: 'CONTENT_HELLO' }).catch(() => {
    // Background may not be ready yet; TRACKS_EXTRACTED / next load will retry.
  })
}

export default defineContentScript({
  matches: ['*://*.beatport.com/*'],
  runAt: 'document_start',
  main() {
    lifecycle = createCaptureLifecycle(
      {
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: id => clearTimeout(id)
      },
      { href: location.href, startedAt: Date.now() }
    )
    void loadDebugLoggingFlag()
    announceTab()

    window.addEventListener(PAYLOAD_EVENT, event => {
      const customEvent = event as CustomEvent
      latestPayload = customEvent.detail
      scheduleExtraction(latestPayload)
    })

    window.addEventListener(LOCATION_EVENT, () => {
      const capture = getLifecycle()
      const previousHref = capture.getLastHref()
      const nextHref = location.href
      if (capture.pathChanged(previousHref, nextHref)) {
        latestPayload = undefined
      }

      // Next.js may rewrite the URL during hydration. Keep the first-load
      // capture window; later SPA navigations wait for a manual Refresh.
      const result = capture.onLocationChange(nextHref, Date.now())
      if (result === 'disarmed') {
        observer?.disconnect()
      }
    })

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (
        message?.type === 'REQUEST_TAB_CAPTURE' ||
        message?.type === 'REQUEST_REFRESH'
      ) {
        const hadPayload = latestPayload !== undefined
        void captureNow().then(() =>
          sendResponse({
            ok: true,
            hadPayload,
            trackCount: currentSnapshot?.trackCount ?? 0
          })
        )
        return true
      }
      return false
    })

    observeDom()

    const onReady = () => {
      const capture = getLifecycle()
      if (!capture.isArmed()) return
      capture.bumpSettle()
      void extractAndPublish(latestPayload)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady)
    } else {
      onReady()
    }
  }
})
