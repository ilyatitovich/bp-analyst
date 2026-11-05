import { emptyAttempt } from './diagnostics'
import {
  buildSnapshot,
  looksLikeRawTrack,
  normalizeRawItems,
  type NormalizeContext
} from './normalize'
import type { ExtractResult } from '../types/track'

type QueryData = {
  results?: unknown[]
  pages?: Array<{ results?: unknown[] }>
}

type NextData = {
  props?: {
    pageProps?: {
      dehydratedState?: {
        queries?: Array<{
          state?: {
            data?: QueryData
          }
        }>
      }
    }
  }
}

let cachedText: string | null = null
let cachedParsed: NextData | null = null

/** Parse `__NEXT_DATA__` JSON, reusing the last parse when the text is unchanged. */
export function parseNextDataText(text: string): NextData | null {
  if (cachedText === text && cachedParsed) return cachedParsed

  try {
    const parsed = JSON.parse(text) as NextData
    cachedText = text
    cachedParsed = parsed
    return parsed
  } catch {
    cachedText = null
    cachedParsed = null
    return null
  }
}

/** Test helper — clears the module-level parse cache. */
export function clearNextDataParseCache(): void {
  cachedText = null
  cachedParsed = null
}

function collectQueryResults(data: QueryData | undefined): unknown[] {
  if (!data) return []
  if (Array.isArray(data.pages)) {
    return data.pages.flatMap(page =>
      Array.isArray(page?.results) ? page.results : []
    )
  }
  return Array.isArray(data.results) ? data.results : []
}

export function extractSnapshotFromNextDataObject(
  parsed: NextData,
  context: NormalizeContext
): ExtractResult {
  const queries = parsed.props?.pageProps?.dehydratedState?.queries ?? []
  const ranked = queries
    .map(query =>
      collectQueryResults(query.state?.data).filter(looksLikeRawTrack)
    )
    .sort((left, right) => right.length - left.length)
  const results = ranked[0]
  if (!results?.length) {
    return { snapshot: null, attempt: emptyAttempt(context.source) }
  }

  const { tracks, attempt } = normalizeRawItems(results, context)
  if (!tracks.length) {
    return { snapshot: null, attempt }
  }

  return { snapshot: buildSnapshot(tracks, context), attempt }
}

export function extractSnapshotFromNextData(
  context: NormalizeContext
): ExtractResult {
  const script = document.getElementById('__NEXT_DATA__')
  if (!script?.textContent) {
    return { snapshot: null, attempt: emptyAttempt(context.source) }
  }

  const parsed = parseNextDataText(script.textContent)
  if (!parsed) {
    return { snapshot: null, attempt: emptyAttempt(context.source) }
  }
  return extractSnapshotFromNextDataObject(parsed, context)
}
