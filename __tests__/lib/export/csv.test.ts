import { describe, expect, it } from 'vitest'
import { buildCsvFilename, tracksToCsv } from '../../../src/lib/export/csv'
import type { Track } from '../../../src/lib/types/track'

const track: Track = {
  id: 1,
  position: 1,
  title: 'Reason, Why',
  mixName: 'Extended Mix',
  artists: [{ name: 'Artist One' }, { name: 'Artist Two' }],
  remixers: [],
  bpm: 128,
  keyName: 'A Minor',
  camelot: '8A',
  genre: { name: 'Melodic House & Techno' },
  subGenre: null,
  label: { name: 'Label' },
  releaseName: 'Release',
  length: '6:01',
  lengthMs: 361000,
  publishDate: '2026-08-18',
  price: '$1.69',
  exclusive: false,
  hype: true,
  isrc: 'ABC123',
  slug: 'reason-why',
  trackUrl: 'https://www.beatport.com/track/reason-why/1',
  previewUrl: null,
  previewStartMs: null,
  previewEndMs: null,
  artworkUrl: null
}

const pageUrl = 'https://www.beatport.com/genre/melodic-house-techno/90/top-100'

describe('tracksToCsv', () => {
  it('serializes rows with escaping and bom', () => {
    const csv = tracksToCsv([track], pageUrl)
    expect(csv.startsWith('\uFEFFposition,title')).toBe(true)
    expect(csv).toContain('"Reason, Why"')
    expect(csv).toContain('Artist One; Artist Two')
    expect(csv).toContain(pageUrl)
  })

  it('neutralizes formula-leading cells and quotes carriage returns', () => {
    const csv = tracksToCsv(
      [
        {
          ...track,
          title: '=cmd|"/C calc"!A0',
          mixName: '+1-555',
          artists: [{ name: '-paid' }, { name: '@sum(1+1)' }],
          releaseName: 'Line\rBreak'
        }
      ],
      pageUrl
    )

    expect(csv).toContain(`"'=cmd|""/C calc""!A0"`)
    expect(csv).toContain("'+1-555")
    expect(csv).toContain("'-paid; @sum(1+1)")
    expect(csv).toContain('"Line\rBreak"')
  })

  it('builds a descriptive filename', () => {
    expect(buildCsvFilename(pageUrl)).toMatch(
      /^beatport-genre-melodic-house-techno-90-top-100-\d{4}-\d{2}-\d{2}\.csv$/
    )
  })
})
