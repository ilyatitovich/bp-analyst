export type SnapshotCoverage = {
  listCount: number | null
  complete: boolean
}

function asNonNegativeInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null
}

function pageHasMore(next: unknown): boolean {
  return typeof next === 'string' && next.length > 0
}

/**
 * Read Beatport catalog pagination metadata (`count` + `next`).
 * Supports a flat page payload and React Query infinite `{ pages: [...] }`.
 */
export function readCatalogCoverage(
  payload: unknown,
  capturedTrackCount: number
): SnapshotCoverage | null {
  if (!payload || typeof payload !== 'object') return null

  const root = payload as Record<string, unknown>
  const sources: Array<Record<string, unknown>> = [root]
  if (Array.isArray(root.pages)) {
    for (const page of root.pages) {
      if (page && typeof page === 'object') {
        sources.push(page as Record<string, unknown>)
      }
    }
  }

  let listCount: number | null = null
  let sawNextField = false
  let hasMore = false

  for (const source of sources) {
    if (listCount === null) {
      listCount = asNonNegativeInt(source.count)
    }
    if ('next' in source) {
      sawNextField = true
      if (pageHasMore(source.next)) hasMore = true
    }
  }

  if (listCount === null && !sawNextField) return null

  return {
    listCount,
    complete:
      !hasMore && (listCount === null || capturedTrackCount >= listCount)
  }
}

/** Prefer the known list size; recompute completeness from the merged capture. */
export function mergeCoverage(
  current: { listCount?: number | null; complete?: boolean } | null | undefined,
  incoming:
    { listCount?: number | null; complete?: boolean } | null | undefined,
  mergedTrackCount: number
): SnapshotCoverage | undefined {
  const counts = [current?.listCount, incoming?.listCount].filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value)
  )
  const listCount =
    counts.length > 0
      ? Math.max(...counts)
      : (current?.listCount ?? incoming?.listCount ?? undefined)

  const hasCoverage =
    listCount !== undefined ||
    typeof current?.complete === 'boolean' ||
    typeof incoming?.complete === 'boolean'
  if (!hasCoverage) return undefined

  if (typeof listCount === 'number') {
    return { listCount, complete: mergedTrackCount >= listCount }
  }

  if (current?.complete === true || incoming?.complete === true) {
    return { listCount: listCount ?? null, complete: true }
  }
  if (current?.complete === false || incoming?.complete === false) {
    return { listCount: listCount ?? null, complete: false }
  }

  return { listCount: listCount ?? null, complete: false }
}
