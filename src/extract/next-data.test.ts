import { describe, expect, it } from 'vitest';
import { extractSnapshotFromNextDataObject } from './next-data';

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
                      camelot_letter: 'B',
                    },
                    genre: { id: 11, name: 'Tech House', slug: 'tech-house' },
                    sub_genre: null,
                    release: {
                      name: 'Beat Goes On (Extended Mix)',
                      label: { id: 96547, name: 'Maccabi House', slug: 'maccabi-house' },
                    },
                    length: '5:09',
                    length_ms: 309677,
                    publish_date: '2026-07-24',
                    price: { display: '$1.69' },
                    exclusive: false,
                    is_hype: false,
                    isrc: 'QMBZ92656424',
                    slug: 'beat-goes-on',
                  },
                ],
              },
            },
          },
        ],
      },
    },
  },
};

describe('extractSnapshotFromNextDataObject', () => {
  it('normalizes beatport dehydrated track data', () => {
    const snapshot = extractSnapshotFromNextDataObject(nextDataFixture, {
      pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
      pageTitle: 'Tech House Top 100',
      source: 'next-data',
    });

    expect(snapshot?.trackCount).toBe(1);
    expect(snapshot?.tracks[0].camelot).toBe('11B');
    expect(snapshot?.tracks[0].label?.name).toBe('Maccabi House');
    expect(snapshot?.tracks[0].trackUrl).toBe('https://www.beatport.com/track/beat-goes-on/29486878');
  });

  it('uses the largest track query instead of a top-10 widget', () => {
    const smallTrack = nextDataFixture.props.pageProps.dehydratedState.queries[0].state.data.results[0];
    const snapshot = extractSnapshotFromNextDataObject(
      {
        props: {
          pageProps: {
            dehydratedState: {
              queries: [
                {
                  state: {
                    data: {
                      results: [smallTrack, { ...smallTrack, id: 2, name: 'Other' }],
                    },
                  },
                },
                {
                  state: {
                    data: {
                      results: Array.from({ length: 100 }, (_, index) => ({
                        ...smallTrack,
                        id: index + 10,
                        name: `Track ${index + 10}`,
                      })),
                    },
                  },
                },
              ],
            },
          },
        },
      },
      {
        pageUrl: 'https://www.beatport.com/genre/tech-house/11/top-100',
        pageTitle: 'Tech House Top 100',
        source: 'next-data',
      },
    );

    expect(snapshot?.trackCount).toBe(100);
  });
});
