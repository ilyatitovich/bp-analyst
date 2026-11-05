# Extraction benchmarks

Measured on 2026-11-05 via `pnpm bench:extract` (Node median of warmed runs).

## Message / storage size

Page-level fields (`pageUrl`, `pageTitle`, `extractedAt`, `source`) live on
`ExtractionSnapshot` only. Replicating them on every `Track` was the prior shape.

| Tracks | Legacy snapshot JSON | Slim snapshot JSON | Saved            |
| ------ | -------------------- | ------------------ | ---------------- |
| 100    | 84.8 KB              | 69.1 KB            | 15.7 KB (18.5%)  |
| 1000   | 854.2 KB             | 697.9 KB           | 156.4 KB (18.3%) |

## Extraction timing

| Tracks | normalizeRawItems | uniqueTracks | buildSnapshot | next-data extract | NEXT_DATA parse (cold) | NEXT_DATA parse (cached) |
| ------ | ----------------- | ------------ | ------------- | ----------------- | ---------------------- | ------------------------ |
| 100    | 0.34 ms           | 0.06 ms      | 0.06 ms       | 0.24 ms           | 0.21 ms                | 0.00 ms                  |
| 1000   | 2.11 ms           | 1.25 ms      | 0.71 ms       | 2.27 ms           | 2.34 ms                | 0.00 ms                  |

## Decisions

- **Slim `Track`:** keep page metadata on the snapshot. Message and session-storage
  payloads shrink ~18% at list sizes we care about.
- **`uniqueTracks` once:** dedupe runs inside `buildSnapshot` (and therefore at
  merge). The side panel and report consume `snapshot.tracks` directly.
- **`__NEXT_DATA__` parse cache:** identical script text reuses the last
  `JSON.parse` result across the 150 ms debounce window.
- **Table virtualization:** not added. At 100–1,000 rows the normalize + stringify
  costs dominate UI concerns; Beatport lists are typically a few hundred rows.
