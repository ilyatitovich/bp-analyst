import { describe, expect, it } from 'vitest'
import {
  isExtractionSnapshot,
  isExtensionSender,
  parseBeatportAnalystMessage
} from '../../../src/lib/messaging/validate'
import type { ExtractionSnapshot } from '../../../src/lib/types/track'

const snapshot: ExtractionSnapshot = {
  pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
  pageTitle: 'Tech House Top 100',
  extractedAt: '2026-08-18T08:00:00.000Z',
  source: 'api-payload',
  trackCount: 0,
  tracks: []
}

describe('isExtensionSender', () => {
  it('requires a matching extension id', () => {
    expect(isExtensionSender({ id: 'ext-a' }, 'ext-a')).toBe(true)
    expect(isExtensionSender({ id: 'ext-b' }, 'ext-a')).toBe(false)
    expect(isExtensionSender({}, 'ext-a')).toBe(false)
    expect(isExtensionSender({ id: 'ext-a' }, undefined)).toBe(false)
  })
})

describe('isExtractionSnapshot', () => {
  it('accepts a well-shaped snapshot', () => {
    expect(isExtractionSnapshot(snapshot)).toBe(true)
    expect(
      isExtractionSnapshot({
        ...snapshot,
        tracks: [{ id: 1 }, { id: 2 }]
      })
    ).toBe(true)
  })

  it('rejects missing fields, bad source, or non-object tracks', () => {
    expect(isExtractionSnapshot(null)).toBe(false)
    expect(isExtractionSnapshot({ ...snapshot, source: 'forged' })).toBe(false)
    expect(isExtractionSnapshot({ ...snapshot, tracks: 'nope' })).toBe(false)
    expect(isExtractionSnapshot({ ...snapshot, tracks: [null] })).toBe(false)
    expect(isExtractionSnapshot({ ...snapshot, trackCount: '3' })).toBe(false)
    expect(isExtractionSnapshot({ ...snapshot, pageUrl: 1 })).toBe(false)
  })
})

describe('parseBeatportAnalystMessage', () => {
  it('parses known message shapes', () => {
    expect(
      parseBeatportAnalystMessage({
        type: 'TRACKS_EXTRACTED',
        snapshot
      })
    ).toEqual({ type: 'TRACKS_EXTRACTED', snapshot })

    expect(
      parseBeatportAnalystMessage({
        type: 'EXTRACTION_FAILED',
        pageUrl: snapshot.pageUrl,
        pageTitle: snapshot.pageTitle
      })
    ).toEqual({
      type: 'EXTRACTION_FAILED',
      pageUrl: snapshot.pageUrl,
      pageTitle: snapshot.pageTitle
    })

    const diagnostics = {
      winningSource: null,
      sources: [
        {
          source: 'api-payload' as const,
          rawItemCount: 0,
          acceptedCount: 0,
          rejects: {}
        }
      ]
    }
    expect(
      parseBeatportAnalystMessage({
        type: 'EXTRACTION_FAILED',
        pageUrl: snapshot.pageUrl,
        pageTitle: snapshot.pageTitle,
        diagnostics
      })
    ).toEqual({
      type: 'EXTRACTION_FAILED',
      pageUrl: snapshot.pageUrl,
      pageTitle: snapshot.pageTitle,
      diagnostics
    })

    expect(
      parseBeatportAnalystMessage({
        type: 'REQUEST_REFRESH',
        force: true,
        auto: false
      })
    ).toEqual({ type: 'REQUEST_REFRESH', force: true, auto: false })

    expect(parseBeatportAnalystMessage({ type: 'CONTENT_HELLO' })).toEqual({
      type: 'CONTENT_HELLO'
    })
    expect(
      parseBeatportAnalystMessage({ type: 'REQUEST_TAB_CAPTURE' })
    ).toEqual({ type: 'REQUEST_TAB_CAPTURE' })
  })

  it('drops forged or malformed payloads before they can be persisted', () => {
    expect(parseBeatportAnalystMessage(null)).toBeNull()
    expect(parseBeatportAnalystMessage({ type: 'UNKNOWN' })).toBeNull()
    expect(
      parseBeatportAnalystMessage({
        type: 'TRACKS_EXTRACTED',
        snapshot: { ...snapshot, tracks: 'bad' }
      })
    ).toBeNull()
    expect(
      parseBeatportAnalystMessage({
        type: 'EXTRACTION_FAILED',
        pageUrl: snapshot.pageUrl
      })
    ).toBeNull()
    expect(
      parseBeatportAnalystMessage({
        type: 'EXTRACTION_FAILED',
        pageUrl: snapshot.pageUrl,
        pageTitle: snapshot.pageTitle,
        diagnostics: { winningSource: 'forged', sources: [] }
      })
    ).toBeNull()
    expect(
      parseBeatportAnalystMessage({
        type: 'REQUEST_REFRESH',
        force: 'yes'
      })
    ).toBeNull()
  })
})
