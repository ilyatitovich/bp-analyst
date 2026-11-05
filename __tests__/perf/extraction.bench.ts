/**
 * Benchmarks extraction cost and snapshot message size at 100 and 1,000 tracks.
 * Writes docs/BENCHMARKS.md. Run: pnpm bench:extract
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import {
  buildSnapshot,
  normalizeRawItems,
  uniqueTracks
} from '../../src/lib/extract/normalize'
import {
  clearNextDataParseCache,
  extractSnapshotFromNextDataObject,
  parseNextDataText
} from '../../src/lib/extract/next-data'
import type { Track } from '../../src/lib/types/track'

const PAGE_URL = 'https://www.beatport.com/genre/tech-house/11/top-100'
const PAGE_TITLE = 'Tech House Top 100'
const CONTEXT = {
  pageUrl: PAGE_URL,
  pageTitle: PAGE_TITLE,
  source: 'api-payload' as const
}

const LEGACY_PAGE_FIELDS = {
  pageUrl: PAGE_URL,
  pageTitle: PAGE_TITLE,
  extractedAt: '2026-08-18T08:00:00.000Z',
  source: 'api-payload' as const
}

function rawTrack(id: number) {
  return {
    id,
    name: `Track ${id}`,
    mix_name: id % 3 === 0 ? 'Extended Mix' : id % 3 === 1 ? 'Radio Edit' : '',
    artists: [{ id: (id % 20) + 1, name: `Artist ${(id % 20) + 1}` }],
    remixers: [],
    bpm: 120 + (id % 20),
    key: { name: 'A Minor', camelot_number: 8, camelot_letter: 'A' },
    genre: { id: 11, name: 'Tech House', slug: 'tech-house' },
    release: {
      name: `Release ${id}`,
      label: { id: (id % 10) + 1, name: `Label ${(id % 10) + 1}` }
    },
    length: '5:00',
    length_ms: 300_000,
    publish_date: '2026-08-01',
    price: { display: '$1.69' },
    exclusive: id % 7 === 0,
    is_hype: id % 11 === 0,
    isrc: `USABC${String(id).padStart(7, '0')}`,
    slug: `track-${id}`,
    sample_url: `https://geo-samples.beatport.com/track/${id}.LOFI.mp3`,
    sample_start_ms: 30_000,
    sample_end_ms: 150_000,
    image: {
      uri: `https://geo-media.beatport.com/image_size/80x80/${id}.jpg`
    }
  }
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

function timeMs(fn: () => void, iterations: number): number {
  const samples: number[] = []
  for (let i = 0; i < 3; i += 1) fn()
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  return median(samples)
}

function utf8Bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function slimTrack(id: number): Track {
  return normalizeRawItems([rawTrack(id)], CONTEXT).tracks[0]!
}

function withLegacyFields(track: Track) {
  return { ...track, ...LEGACY_PAGE_FIELDS }
}

function nextDataPayload(count: number) {
  return {
    props: {
      pageProps: {
        dehydratedState: {
          queries: [
            {
              state: {
                data: {
                  results: Array.from({ length: count }, (_, index) =>
                    rawTrack(index + 1)
                  )
                }
              }
            }
          ]
        }
      }
    }
  }
}

type SizeRow = {
  tracks: number
  slimBytes: number
  legacyBytes: number
  savedBytes: number
  savedPct: number
}

type TimingRow = {
  tracks: number
  normalizeMs: number
  uniqueMs: number
  buildSnapshotMs: number
  nextDataExtractMs: number
  parseColdMs: number
  parseCachedMs: number
}

function measureSizes(counts: number[]): SizeRow[] {
  return counts.map(count => {
    const tracks = Array.from({ length: count }, (_, index) =>
      slimTrack(index + 1)
    )
    const slimSnapshot = buildSnapshot(tracks, CONTEXT)
    const legacySnapshot = {
      ...slimSnapshot,
      tracks: tracks.map(withLegacyFields)
    }
    const slimBytes = utf8Bytes(slimSnapshot)
    const legacyBytes = utf8Bytes(legacySnapshot)
    const savedBytes = legacyBytes - slimBytes
    return {
      tracks: count,
      slimBytes,
      legacyBytes,
      savedBytes,
      savedPct: (savedBytes / legacyBytes) * 100
    }
  })
}

function measureTimings(counts: number[]): TimingRow[] {
  return counts.map(count => {
    const rawItems = Array.from({ length: count }, (_, index) =>
      rawTrack(index + 1)
    )
    const tracks = normalizeRawItems(rawItems, CONTEXT).tracks
    const nextPayload = nextDataPayload(count)
    const nextText = JSON.stringify(nextPayload)
    const iterations = count <= 100 ? 40 : 15

    const normalizeMs = timeMs(() => {
      normalizeRawItems(rawItems, CONTEXT)
    }, iterations)

    const uniqueMs = timeMs(() => {
      uniqueTracks(tracks)
    }, iterations)

    const buildSnapshotMs = timeMs(() => {
      buildSnapshot(tracks, CONTEXT)
    }, iterations)

    const nextDataExtractMs = timeMs(() => {
      extractSnapshotFromNextDataObject(nextPayload, {
        ...CONTEXT,
        source: 'next-data'
      })
    }, iterations)

    clearNextDataParseCache()
    const parseColdMs = timeMs(
      () => {
        clearNextDataParseCache()
        parseNextDataText(nextText)
      },
      Math.max(8, Math.floor(iterations / 2))
    )

    parseNextDataText(nextText)
    const parseCachedMs = timeMs(() => {
      parseNextDataText(nextText)
    }, iterations)

    return {
      tracks: count,
      normalizeMs,
      uniqueMs,
      buildSnapshotMs,
      nextDataExtractMs,
      parseColdMs,
      parseCachedMs
    }
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatMs(ms: number): string {
  return `${ms.toFixed(2)} ms`
}

function renderMarkdown(sizes: SizeRow[], timings: TimingRow[]): string {
  const sizeLines = sizes
    .map(
      row =>
        `| ${row.tracks} | ${formatBytes(row.legacyBytes)} | ${formatBytes(row.slimBytes)} | ${formatBytes(row.savedBytes)} (${row.savedPct.toFixed(1)}%) |`
    )
    .join('\n')

  const timingLines = timings
    .map(
      row =>
        `| ${row.tracks} | ${formatMs(row.normalizeMs)} | ${formatMs(row.uniqueMs)} | ${formatMs(row.buildSnapshotMs)} | ${formatMs(row.nextDataExtractMs)} | ${formatMs(row.parseColdMs)} | ${formatMs(row.parseCachedMs)} |`
    )
    .join('\n')

  const date = new Date().toISOString().slice(0, 10)
  const lowPct = sizes[0]?.savedPct.toFixed(0) ?? '10'
  const highPct = sizes.at(-1)?.savedPct.toFixed(0) ?? '15'

  return `# Extraction benchmarks

Measured on ${date} via \`pnpm bench:extract\` (Node median of warmed runs).

## Message / storage size

Page-level fields (\`pageUrl\`, \`pageTitle\`, \`extractedAt\`, \`source\`) live on
\`ExtractionSnapshot\` only. Replicating them on every \`Track\` was the prior shape.

| Tracks | Legacy snapshot JSON | Slim snapshot JSON | Saved |
| ------ | -------------------- | ------------------ | ----- |
${sizeLines}

## Extraction timing

| Tracks | normalizeRawItems | uniqueTracks | buildSnapshot | next-data extract | NEXT_DATA parse (cold) | NEXT_DATA parse (cached) |
| ------ | ----------------- | ------------ | ------------- | ----------------- | ---------------------- | ------------------------ |
${timingLines}

## Decisions

- **Slim \`Track\`:** keep page metadata on the snapshot. Message and session-storage
  payloads shrink ~${lowPct}–${highPct}% at list sizes we care about.
- **\`uniqueTracks\` once:** dedupe runs inside \`buildSnapshot\` (and therefore at
  merge). The side panel and report consume \`snapshot.tracks\` directly.
- **\`__NEXT_DATA__\` parse cache:** identical script text reuses the last
  \`JSON.parse\` result across the 150 ms debounce window.
- **Table virtualization:** not added. At 100–1,000 rows the normalize + stringify
  costs dominate UI concerns; Beatport lists are typically a few hundred rows.
`
}

describe('extraction benchmarks', () => {
  it('records message size and timing for 100 and 1,000 tracks', () => {
    const counts = [100, 1000]
    const sizes = measureSizes(counts)
    const timings = measureTimings(counts)

    for (const row of sizes) {
      expect(row.slimBytes).toBeLessThan(row.legacyBytes)
      expect(row.savedPct).toBeGreaterThan(5)
    }

    for (const row of timings) {
      expect(row.parseCachedMs).toBeLessThanOrEqual(
        row.parseColdMs * 1.5 + 0.05
      )
      expect(row.buildSnapshotMs).toBeGreaterThan(0)
    }

    const docsDir = join(dirname(fileURLToPath(import.meta.url)), '../../docs')
    mkdirSync(docsDir, { recursive: true })
    writeFileSync(
      join(docsDir, 'BENCHMARKS.md'),
      renderMarkdown(sizes, timings)
    )
  })
})
