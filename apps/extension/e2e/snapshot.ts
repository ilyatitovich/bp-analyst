/// <reference types="chrome" />
import type { Worker } from '@playwright/test'
import { expect } from './fixtures'

export type StoredSnapshot = {
  trackCount?: number
  listCount?: number | null
  complete?: boolean
  tracks?: Array<{ title?: string }>
}

export async function readSnapshot(
  serviceWorker: Worker,
  key: string
): Promise<StoredSnapshot | null> {
  return (await serviceWorker.evaluate(async storageKey => {
    const session = chrome.storage.session ?? chrome.storage.local
    const result = await session.get(storageKey)
    return (result[storageKey] as StoredSnapshot | null | undefined) ?? null
  }, key)) as StoredSnapshot | null
}

export async function findBeatportTabId(
  serviceWorker: Worker
): Promise<number | null> {
  return serviceWorker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: '*://*.beatport.com/*' })
    return tab?.id ?? null
  })
}

/** Wait until catalog coverage (listCount) has merged, not just the first DOM extract. */
export async function waitForCoveredSnapshot(
  serviceWorker: Worker,
  tabId: number,
  expected: { trackCount: number; listCount: number } = {
    trackCount: 3,
    listCount: 100
  }
): Promise<StoredSnapshot> {
  const key = `beatportAnalyst.snapshot.${tabId}`

  await expect
    .poll(
      async () => {
        const stored = await readSnapshot(serviceWorker, key)
        if (!stored || (stored.trackCount ?? 0) < expected.trackCount) {
          return null
        }
        return {
          trackCount: stored.trackCount ?? 0,
          listCount: stored.listCount ?? null
        }
      },
      {
        message: `waiting for covered snapshot at ${key}`,
        timeout: 15_000
      }
    )
    .toEqual(expected)

  const snapshot = await readSnapshot(serviceWorker, key)
  if (!snapshot) {
    throw new Error(`Snapshot missing after poll for ${key}`)
  }
  return snapshot
}
