/** Timing for the Beatport content-script capture window. */
export const CAPTURE_TIMING = {
  failDelayMs: 2500,
  settleMs: 2000,
  startupNavGraceMs: 500,
  extractDebounceMs: 150
} as const

export type TimerId = ReturnType<typeof setTimeout>

export type CaptureTimers = {
  setTimeout: (fn: () => void, ms: number) => TimerId
  clearTimeout: (id: TimerId) => void
}

export type LocationChangeResult = 'ignored' | 'startup-grace' | 'disarmed'

export function pathnameOf(href: string): string {
  try {
    return new URL(href).pathname
  } catch {
    return href
  }
}

/**
 * Pure arm / disarm / settle / fail-timer state for the content script.
 * DOM observers and messaging stay in the entrypoint; this owns the window.
 */
export function createCaptureLifecycle(
  timers: CaptureTimers,
  initial: { href: string; startedAt: number }
) {
  let armed = true
  let lastHref = initial.href
  const startedAt = initial.startedAt
  let settleTimer: TimerId | null = null
  let failTimer: TimerId | null = null
  let failurePublished = false

  function clearSettleTimer(): void {
    if (settleTimer === null) return
    timers.clearTimeout(settleTimer)
    settleTimer = null
  }

  function clearFailTimer(): void {
    if (failTimer === null) return
    timers.clearTimeout(failTimer)
    failTimer = null
  }

  function disarm(): void {
    armed = false
    clearSettleTimer()
    clearFailTimer()
  }

  function bumpSettle(): void {
    if (!armed) return
    clearSettleTimer()
    settleTimer = timers.setTimeout(() => {
      settleTimer = null
      disarm()
    }, CAPTURE_TIMING.settleMs)
  }

  function arm(href: string): void {
    armed = true
    lastHref = href
    bumpSettle()
  }

  /**
   * Schedule EXTRACTION_FAILED after the fail delay when still armed and empty.
   * Returns false if a failure should not be scheduled.
   */
  function scheduleFailure(onFail: () => void): boolean {
    if (!armed || failurePublished || failTimer !== null) return false
    failTimer = timers.setTimeout(() => {
      failTimer = null
      if (!armed) return
      failurePublished = true
      onFail()
    }, CAPTURE_TIMING.failDelayMs)
    return true
  }

  function clearFailure(): void {
    clearFailTimer()
    failurePublished = false
  }

  function setFailurePublished(value: boolean): void {
    failurePublished = value
  }

  function onLocationChange(href: string, now: number): LocationChangeResult {
    if (href === lastHref) return 'ignored'

    lastHref = href
    if (now - startedAt < CAPTURE_TIMING.startupNavGraceMs) {
      return 'startup-grace'
    }

    disarm()
    return 'disarmed'
  }

  function pathChanged(fromHref: string, toHref: string): boolean {
    return pathnameOf(fromHref) !== pathnameOf(toHref)
  }

  return {
    isArmed: () => armed,
    getLastHref: () => lastHref,
    isFailurePublished: () => failurePublished,
    hasFailTimer: () => failTimer !== null,
    hasSettleTimer: () => settleTimer !== null,
    getStartedAt: () => startedAt,
    arm,
    disarm,
    bumpSettle,
    scheduleFailure,
    clearFailure,
    clearFailTimer,
    setFailurePublished,
    onLocationChange,
    pathChanged
  }
}

export type CaptureLifecycle = ReturnType<typeof createCaptureLifecycle>
