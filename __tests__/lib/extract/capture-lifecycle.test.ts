import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAPTURE_TIMING,
  createCaptureLifecycle,
  pathnameOf
} from '../../../src/lib/extract/capture-lifecycle'

describe('pathnameOf', () => {
  it('returns the pathname for absolute URLs', () => {
    expect(
      pathnameOf('https://www.beatport.com/genre/tech-house/11/top-100')
    ).toBe('/genre/tech-house/11/top-100')
  })

  it('falls back to the raw string when URL parsing fails', () => {
    expect(pathnameOf('not a url')).toBe('not a url')
  })
})

describe('createCaptureLifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createLifecycle(
    href = 'https://www.beatport.com/genre/tech-house/11/top-100'
  ) {
    return createCaptureLifecycle(
      {
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: id => clearTimeout(id)
      },
      { href, startedAt: 1_000 }
    )
  }

  it('starts armed and settles after the settle window', () => {
    const lifecycle = createLifecycle()
    expect(lifecycle.isArmed()).toBe(true)

    lifecycle.bumpSettle()
    expect(lifecycle.hasSettleTimer()).toBe(true)

    vi.advanceTimersByTime(CAPTURE_TIMING.settleMs - 1)
    expect(lifecycle.isArmed()).toBe(true)

    vi.advanceTimersByTime(1)
    expect(lifecycle.isArmed()).toBe(false)
    expect(lifecycle.hasSettleTimer()).toBe(false)
  })

  it('re-arms and resets the settle window', () => {
    const lifecycle = createLifecycle()
    lifecycle.bumpSettle()
    vi.advanceTimersByTime(CAPTURE_TIMING.settleMs)
    expect(lifecycle.isArmed()).toBe(false)

    lifecycle.arm('https://www.beatport.com/genre/tech-house/11/top-100')
    expect(lifecycle.isArmed()).toBe(true)
    expect(lifecycle.hasSettleTimer()).toBe(true)

    vi.advanceTimersByTime(CAPTURE_TIMING.settleMs)
    expect(lifecycle.isArmed()).toBe(false)
  })

  it('extends settle when bumped again before expiry', () => {
    const lifecycle = createLifecycle()
    lifecycle.bumpSettle()
    vi.advanceTimersByTime(CAPTURE_TIMING.settleMs - 200)
    lifecycle.bumpSettle()
    vi.advanceTimersByTime(CAPTURE_TIMING.settleMs - 1)
    expect(lifecycle.isArmed()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(lifecycle.isArmed()).toBe(false)
  })

  it('schedules failure once and marks it published when the timer fires', () => {
    const lifecycle = createLifecycle()
    const onFail = vi.fn()

    expect(lifecycle.scheduleFailure(onFail)).toBe(true)
    expect(lifecycle.scheduleFailure(onFail)).toBe(false)
    expect(lifecycle.hasFailTimer()).toBe(true)

    vi.advanceTimersByTime(CAPTURE_TIMING.failDelayMs)
    expect(onFail).toHaveBeenCalledTimes(1)
    expect(lifecycle.isFailurePublished()).toBe(true)
    expect(lifecycle.scheduleFailure(onFail)).toBe(false)
  })

  it('does not fire failure after disarm', () => {
    const lifecycle = createLifecycle()
    const onFail = vi.fn()

    lifecycle.scheduleFailure(onFail)
    lifecycle.disarm()
    vi.advanceTimersByTime(CAPTURE_TIMING.failDelayMs)

    expect(onFail).not.toHaveBeenCalled()
    expect(lifecycle.isArmed()).toBe(false)
    expect(lifecycle.hasFailTimer()).toBe(false)
  })

  it('clears a pending failure when a snapshot arrives', () => {
    const lifecycle = createLifecycle()
    const onFail = vi.fn()

    lifecycle.scheduleFailure(onFail)
    lifecycle.clearFailure()
    vi.advanceTimersByTime(CAPTURE_TIMING.failDelayMs)

    expect(onFail).not.toHaveBeenCalled()
    expect(lifecycle.isFailurePublished()).toBe(false)
  })

  it('ignores identical location changes', () => {
    const lifecycle = createLifecycle()
    expect(
      lifecycle.onLocationChange(
        'https://www.beatport.com/genre/tech-house/11/top-100',
        1_100
      )
    ).toBe('ignored')
    expect(lifecycle.isArmed()).toBe(true)
  })

  it('keeps the capture window during startup navigation grace', () => {
    const lifecycle = createLifecycle()
    const result = lifecycle.onLocationChange(
      'https://www.beatport.com/genre/tech-house/11/top-100?page=1',
      1_000 + CAPTURE_TIMING.startupNavGraceMs - 1
    )

    expect(result).toBe('startup-grace')
    expect(lifecycle.isArmed()).toBe(true)
    expect(lifecycle.getLastHref()).toContain('page=1')
  })

  it('disarms after startup grace on SPA navigation', () => {
    const lifecycle = createLifecycle()
    lifecycle.bumpSettle()

    const result = lifecycle.onLocationChange(
      'https://www.beatport.com/charts/some-chart/99',
      1_000 + CAPTURE_TIMING.startupNavGraceMs
    )

    expect(result).toBe('disarmed')
    expect(lifecycle.isArmed()).toBe(false)
    expect(lifecycle.hasSettleTimer()).toBe(false)
  })

  it('detects pathname changes for payload invalidation', () => {
    const lifecycle = createLifecycle()
    expect(
      lifecycle.pathChanged(
        'https://www.beatport.com/genre/tech-house/11/top-100',
        'https://www.beatport.com/genre/tech-house/11/top-100?page=2'
      )
    ).toBe(false)
    expect(
      lifecycle.pathChanged(
        'https://www.beatport.com/genre/tech-house/11/top-100',
        'https://www.beatport.com/charts/other/1'
      )
    ).toBe(true)
  })
})
