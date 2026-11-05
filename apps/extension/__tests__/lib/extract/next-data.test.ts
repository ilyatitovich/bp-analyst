import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearNextDataParseCache,
  extractSnapshotFromNextDataObject,
  parseNextDataText
} from '../../../src/lib/extract/next-data'

const nextDataFixture = {
  props: {
    pageProps: {
      dehydratedState: {
        queries: [
          {
            state: {
              data: {
                results: [
                  {
                    id: 29486878,
                    name: 'Beat Goes On',
                    mix_name: 'Extended Mix',
                    artists: [{ id: 1, name: 'Rafael', slug: 'rafael' }],
                    remixers: [],
                    bpm: 124,
                    key: {
                      name: 'A Major',
                      camelot_number: 11,
                      camelot_letter: 'B'
                    },
                    genre: { id: 11, name: 'Tech House', slug: 'tech-house' },
                    sub_genre: null,
                    release: {
                      name: 'Beat Goes On (Extended Mix)',
                      label: {
                        id: 96547,
                        name: 'Maccabi House',
                        slug: 'maccabi-house'
                      }
                    },
                    length: '5:09',
                    length_ms: 309677,
                    publish_date: '2026-07-24',
                    price: { display: '$1.69' },
                    exclusive: false,
                    is_hype: false,
                    isrc: 'QMBZ92656424',
                    slug: 'beat-goes-on',
                    sample_url:
                      'https://geo-samples.beatport.com/track/abc.LOFI.mp3',
                    sample_start_ms: 130976,
                    sample_end_ms: 250976,
                    image: {
                      uri: 'https://geo-media.beatport.com/image_size/590x404/art.jpg',
                      dynamic_uri:
                        'https://geo-media.beatport.com/image_size/{w}x{h}/art.jpg'
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    }
  }
}

describe('extractSnapshotFromNextDataObject', () => {
  it('normalizes beatport dehydrated track data', () => {
    const { snapshot, attempt } = extractSnapshotFromNextDataObject(
      nextDataFixture,
      {
        pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
        pageTitle: 'Tech House Top 100',
        source: 'next-data'
      }
    )

    expect(snapshot?.trackCount).toBe(1)
    expect(attempt).toMatchObject({
      source: 'next-data',
      rawItemCount: 1,
      acceptedCount: 1
    })
    const track = snapshot?.tracks[0]
    expect(track?.camelot).toBe('11B')
    expect(track?.label?.name).toBe('Maccabi House')
    expect(track?.trackUrl).toBe(
      'https://www.beatport.com/track/beat-goes-on/29486878'
    )
    expect(track?.previewUrl).toBe(
      'https://geo-samples.beatport.com/track/abc.LOFI.mp3'
    )
    expect(track?.previewStartMs).toBe(130976)
    expect(track?.artworkUrl).toBe(
      'https://geo-media.beatport.com/image_size/80x80/art.jpg'
    )
  })

  it('uses the largest track query instead of a top-10 widget', () => {
    const smallTrack =
      nextDataFixture.props.pageProps.dehydratedState.queries[0]?.state.data
        .results[0]
    const { snapshot } = extractSnapshotFromNextDataObject(
      {
        props: {
          pageProps: {
            dehydratedState: {
              queries: [
                {
                  state: {
                    data: {
                      results: [
                        smallTrack,
                        { ...smallTrack, id: 2, name: 'Other' }
                      ]
                    }
                  }
                },
                {
                  state: {
                    data: {
                      results: Array.from({ length: 100 }, (_, index) => ({
                        ...smallTrack,
                        id: index + 10,
                        name: `Track ${index + 10}`
                      }))
                    }
                  }
                }
              ]
            }
          }
        }
      },
      {
        pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
        pageTitle: 'Tech House Top 100',
        source: 'next-data'
      }
    )

    expect(snapshot?.trackCount).toBe(100)
  })
})

describe('parseNextDataText cache', () => {
  beforeEach(() => {
    clearNextDataParseCache()
  })

  it('reuses the parsed object when the text is unchanged', () => {
    const text = JSON.stringify(nextDataFixture)
    const first = parseNextDataText(text)
    const second = parseNextDataText(text)
    expect(first).not.toBeNull()
    expect(second).toBe(first)
  })

  it('reparses when the text changes', () => {
    const first = parseNextDataText(JSON.stringify(nextDataFixture))
    const altered = {
      ...nextDataFixture,
      props: {
        ...nextDataFixture.props,
        pageProps: {
          ...nextDataFixture.props.pageProps,
          dehydratedState: {
            queries: []
          }
        }
      }
    }
    const second = parseNextDataText(JSON.stringify(altered))
    expect(second).not.toBe(first)
    expect(second?.props?.pageProps?.dehydratedState?.queries).toEqual([])
  })

  it('returns null for invalid JSON and clears the cache', () => {
    const text = JSON.stringify(nextDataFixture)
    expect(parseNextDataText(text)).not.toBeNull()
    expect(parseNextDataText('{broken')).toBeNull()
    expect(parseNextDataText(text)).not.toBeNull()
  })

  it('avoids JSON.parse on a cache hit', () => {
    const text = JSON.stringify(nextDataFixture)
    const parseSpy = vi.spyOn(JSON, 'parse')
    parseNextDataText(text)
    const coldCalls = parseSpy.mock.calls.length
    parseNextDataText(text)
    expect(parseSpy.mock.calls.length).toBe(coldCalls)
    parseSpy.mockRestore()
  })
})
