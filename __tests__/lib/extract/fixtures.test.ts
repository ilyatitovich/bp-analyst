import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractSnapshotFromApiPayload } from '../../../src/lib/extract/api-payload'
import { extractSnapshotFromNextDataObject } from '../../../src/lib/extract/next-data'
import { coverageLabel } from '../../../src/lib/utils/format'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures'
)

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as T
}

const pageContext = {
  pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
  pageTitle: 'Tech House Top 100'
} as const

describe('catalog API fixture', () => {
  const payload = loadJson<unknown>('catalog-tracks-page.json')

  it('normalizes tracks and pagination coverage from a real-shaped page', () => {
    const { snapshot } = extractSnapshotFromApiPayload(payload, {
      ...pageContext,
      source: 'api-payload'
    })

    expect(snapshot).toMatchObject({
      trackCount: 3,
      listCount: 100,
      complete: false,
      source: 'api-payload'
    })
    expect(
      coverageLabel(
        snapshot!.trackCount,
        snapshot!.listCount,
        snapshot!.complete
      )
    ).toBe('Based on 3 of 100 tracks')

    const first = snapshot!.tracks[0]
    expect(first).toBeDefined()
    expect(first).toMatchObject({
      id: 30100101,
      title: 'Night Drive',
      mixName: 'Extended Mix',
      bpm: 126,
      camelot: '4A',
      label: { name: 'Northline' },
      previewUrl:
        'https://geo-samples.beatport.com/track/fixture-night-drive.LOFI.mp3',
      artworkUrl:
        'https://geo-media.beatport.com/image_size/80x80/fixture-night-drive.jpg',
      trackUrl: 'https://www.beatport.com/track/night-drive/30100101'
    })
    expect(snapshot!.tracks.map(track => track.mixName)).toEqual([
      'Extended Mix',
      'Original Mix',
      'Radio Edit'
    ])
  })
})

describe('__NEXT_DATA__ fixture', () => {
  const nextData = loadJson<
    Parameters<typeof extractSnapshotFromNextDataObject>[0]
  >('next-data-top-100.json')

  it('picks the largest dehydrated track query', () => {
    const { snapshot } = extractSnapshotFromNextDataObject(nextData, {
      ...pageContext,
      source: 'next-data'
    })

    expect(snapshot?.trackCount).toBe(3)
    expect(snapshot?.tracks[0]?.title).toBe('Night Drive')
    expect(snapshot?.tracks.some(track => track.title === 'Widget Hit')).toBe(
      false
    )
  })
})
