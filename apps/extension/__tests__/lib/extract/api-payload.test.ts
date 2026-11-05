import { describe, expect, it } from 'vitest'
import { extractSnapshotFromApiPayload } from '../../../src/lib/extract/api-payload'
import { mergeSnapshots } from '../../../src/lib/extract/merge'
import { coverageLabel } from '../../../src/lib/utils/format'

const context = {
  pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
  pageTitle: 'Tech House Top 100',
  source: 'api-payload' as const
}

function rawTrack(id: number, name = `Track ${id}`) {
  return {
    id,
    name,
    mix_name: 'Extended Mix',
    artists: [{ id: 1, name: 'Artist', slug: 'artist' }],
    remixers: [],
    bpm: 124,
    key: { name: 'A Major', camelot_number: 11, camelot_letter: 'B' },
    genre: { id: 11, name: 'Tech House', slug: 'tech-house' },
    release: {
      name: `${name} (Extended Mix)`,
      label: { id: 1, name: 'Label', slug: 'label' }
    },
    slug: `track-${id}`
  }
}

describe('extractSnapshotFromApiPayload coverage', () => {
  it('sets listCount and incomplete when a next page exists', () => {
    const { snapshot, attempt } = extractSnapshotFromApiPayload(
      {
        count: 100,
        next: 'https://api.beatport.com/v4/catalog/tracks/?page=2',
        previous: null,
        results: Array.from({ length: 25 }, (_, index) => rawTrack(index + 1))
      },
      context
    )

    expect(snapshot).toMatchObject({
      trackCount: 25,
      listCount: 100,
      complete: false
    })
    expect(attempt).toMatchObject({
      source: 'api-payload',
      rawItemCount: 25,
      acceptedCount: 25
    })
    expect(
      coverageLabel(
        snapshot!.trackCount,
        snapshot!.listCount,
        snapshot!.complete
      )
    ).toBe('Based on 25 of 100 tracks')
  })

  it('marks a fully captured catalog page complete', () => {
    const { snapshot } = extractSnapshotFromApiPayload(
      {
        count: 10,
        next: null,
        previous: null,
        results: Array.from({ length: 10 }, (_, index) => rawTrack(index + 1))
      },
      context
    )

    expect(snapshot).toMatchObject({
      trackCount: 10,
      listCount: 10,
      complete: true
    })
    expect(
      coverageLabel(
        snapshot!.trackCount,
        snapshot!.listCount,
        snapshot!.complete
      )
    ).toBeNull()
  })

  it('becomes complete after merging remaining pages', () => {
    const page1 = extractSnapshotFromApiPayload(
      {
        count: 40,
        next: 'https://api.beatport.com/v4/catalog/tracks/?page=2',
        results: Array.from({ length: 25 }, (_, index) => rawTrack(index + 1))
      },
      context
    ).snapshot
    const page2 = extractSnapshotFromApiPayload(
      {
        count: 40,
        next: null,
        previous: 'https://api.beatport.com/v4/catalog/tracks/?page=1',
        results: Array.from({ length: 15 }, (_, index) => rawTrack(index + 26))
      },
      context
    ).snapshot

    const merged = mergeSnapshots(page1, page2)
    expect(merged).toMatchObject({
      trackCount: 40,
      listCount: 40,
      complete: true
    })
    expect(
      coverageLabel(merged!.trackCount, merged!.listCount, merged!.complete)
    ).toBeNull()
  })

  it('records reject reasons when catalog rows fail validation', () => {
    const { snapshot, attempt } = extractSnapshotFromApiPayload(
      {
        results: [
          rawTrack(1),
          { ...rawTrack(2), bpm: null },
          { id: 3, name: 'Nope' },
          { ...rawTrack(4), artists: [] }
        ]
      },
      context
    )

    expect(snapshot?.trackCount).toBe(1)
    expect(attempt).toMatchObject({
      rawItemCount: 4,
      acceptedCount: 1,
      rejects: {
        'invalid-bpm': 1,
        'not-raw-track': 1,
        'missing-artists': 1
      }
    })
  })
})
