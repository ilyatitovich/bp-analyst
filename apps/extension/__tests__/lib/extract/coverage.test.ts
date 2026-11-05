import { describe, expect, it } from 'vitest'
import {
  mergeCoverage,
  readCatalogCoverage
} from '../../../src/lib/extract/coverage'
import { coverageLabel } from '../../../src/lib/utils/format'
import { statsBasisLabel } from '../../../src/lib/export/report'

describe('readCatalogCoverage', () => {
  it('marks a full first page complete when next is null', () => {
    expect(
      readCatalogCoverage(
        {
          count: 25,
          next: null,
          results: Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
        },
        25
      )
    ).toEqual({ listCount: 25, complete: true })
  })

  it('marks a partial catalog page incomplete', () => {
    expect(
      readCatalogCoverage(
        {
          count: 100,
          next: 'https://api.beatport.com/v4/catalog/tracks/?page=2',
          previous: null,
          results: Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
        },
        25
      )
    ).toEqual({ listCount: 100, complete: false })
  })

  it('reads count/next from React Query pages', () => {
    expect(
      readCatalogCoverage(
        {
          pages: [
            {
              count: 80,
              next: 'https://api.beatport.com/v4/catalog/tracks/?page=2',
              results: Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
            },
            {
              count: 80,
              next: null,
              results: Array.from({ length: 25 }, (_, i) => ({ id: i + 26 }))
            }
          ]
        },
        50
      )
    ).toEqual({ listCount: 80, complete: false })
  })

  it('returns null when pagination metadata is absent', () => {
    expect(readCatalogCoverage({ results: [{ id: 1 }] }, 1)).toBeNull()
  })
})

describe('mergeCoverage', () => {
  it('recomputes complete from the merged capture size', () => {
    expect(
      mergeCoverage(
        { listCount: 100, complete: false },
        { listCount: 100, complete: false },
        100
      )
    ).toEqual({ listCount: 100, complete: true })
  })
})

describe('coverage labels for paginated captures', () => {
  it('surfaces both UI and report labels while incomplete', () => {
    const coverage = readCatalogCoverage(
      {
        count: 100,
        next: 'https://api.beatport.com/v4/catalog/tracks/?page=2',
        results: []
      },
      25
    )

    expect(coverage).toEqual({ listCount: 100, complete: false })
    expect(coverageLabel(25, coverage?.listCount, coverage?.complete)).toBe(
      'Based on 25 of 100 tracks'
    )
    expect(statsBasisLabel(25, coverage?.listCount, coverage?.complete)).toBe(
      'Stats based on 25 of 100 tracks'
    )
  })

  it('hides the brief coverage label once the list is complete', () => {
    const coverage = readCatalogCoverage(
      { count: 100, next: null, results: [] },
      100
    )
    expect(
      coverageLabel(100, coverage?.listCount, coverage?.complete)
    ).toBeNull()
    expect(statsBasisLabel(100, coverage?.listCount, coverage?.complete)).toBe(
      'Stats based on 100 tracks'
    )
  })
})
