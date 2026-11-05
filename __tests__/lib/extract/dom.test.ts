// @vitest-environment happy-dom

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { extractSnapshotFromDom } from '../../../src/lib/extract/dom'
import { extractSnapshotFromNextData } from '../../../src/lib/extract/next-data'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures'
)

const pageContext = {
  pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
  pageTitle: 'Tech House Top 100'
} as const

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8')
}

describe('extractSnapshotFromDom', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadFixture('chart-tracks-table.html')
  })

  it('extracts usable tracks from chart HTML and skips broken rows', () => {
    const snapshot = extractSnapshotFromDom({
      ...pageContext,
      source: 'dom'
    })

    expect(snapshot).toMatchObject({
      trackCount: 3,
      source: 'dom'
    })
    expect(snapshot!.tracks.map(track => track.title)).toEqual([
      'Night Drive',
      'Warehouse Pulse',
      'Late Signal'
    ])
    const [first, second] = snapshot!.tracks
    expect(first).toMatchObject({
      id: 30100101,
      bpm: 126,
      keyName: 'F Minor',
      genre: { name: 'Tech House' },
      label: { name: 'Northline' },
      length: '6:12',
      publishDate: '2026-06-12',
      price: '$1.79',
      slug: 'night-drive',
      trackUrl: 'https://www.beatport.com/track/night-drive/30100101',
      artists: [{ name: 'Alex Reed' }]
    })
    expect(second?.artists.map(artist => artist.name)).toEqual([
      'Mira Sol',
      'Jon Vale'
    ])
  })

  it('returns null when the tracks table is absent', () => {
    document.body.innerHTML = '<div class="empty">No tracks</div>'
    expect(
      extractSnapshotFromDom({
        ...pageContext,
        source: 'dom'
      })
    ).toBeNull()
  })
})

describe('extractSnapshotFromNextData (document)', () => {
  it('parses a __NEXT_DATA__ script tag from the page', () => {
    const nextData = loadFixture('next-data-top-100.json')
    document.documentElement.innerHTML = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">${nextData}</script>
      </head><body></body></html>
    `

    const snapshot = extractSnapshotFromNextData({
      ...pageContext,
      source: 'next-data'
    })

    expect(snapshot?.trackCount).toBe(3)
    expect(snapshot?.tracks[0]).toBeDefined()
    expect(snapshot?.tracks[0]).toMatchObject({
      id: 30100101,
      camelot: '4A',
      previewUrl:
        'https://geo-samples.beatport.com/track/fixture-night-drive.LOFI.mp3'
    })
  })

  it('returns null for missing or invalid __NEXT_DATA__', () => {
    document.documentElement.innerHTML = '<html><body></body></html>'
    expect(
      extractSnapshotFromNextData({
        ...pageContext,
        source: 'next-data'
      })
    ).toBeNull()

    document.documentElement.innerHTML = `
      <html><head>
        <script id="__NEXT_DATA__" type="application/json">{broken</script>
      </head></html>
    `
    expect(
      extractSnapshotFromNextData({
        ...pageContext,
        source: 'next-data'
      })
    ).toBeNull()
  })
})
