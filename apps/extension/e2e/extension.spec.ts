import { readFileSync } from 'node:fs'
import type { Worker } from '@playwright/test'
import { expect, test } from './fixtures'

type StoredSnapshot = {
  trackCount?: number
  listCount?: number | null
  complete?: boolean
  tracks?: Array<{ title?: string }>
}

async function readSnapshot(
  serviceWorker: Worker,
  key: string
): Promise<StoredSnapshot | null> {
  return (await serviceWorker.evaluate(async storageKey => {
    const session = chrome.storage.session ?? chrome.storage.local
    const result = await session.get(storageKey)
    return (result[storageKey] as StoredSnapshot | null | undefined) ?? null
  }, key)) as StoredSnapshot | null
}

async function waitForSnapshot(
  serviceWorker: Worker,
  tabId: number
): Promise<StoredSnapshot> {
  const key = `beatportAnalyst.snapshot.${tabId}`

  // Wait until the catalog fetch has merged coverage (listCount), not just the
  // first DOM / __NEXT_DATA__ extract which lands earlier without pagination.
  await expect
    .poll(
      async () => {
        const stored = await readSnapshot(serviceWorker, key)
        if (!stored || (stored.trackCount ?? 0) < 3) return null
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
    .toEqual({ trackCount: 3, listCount: 100 })

  const snapshot = await readSnapshot(serviceWorker, key)
  if (!snapshot) {
    throw new Error(`Snapshot missing after poll for ${key}`)
  }
  return snapshot
}

test.describe('built extension against Beatport fixture', () => {
  test('captures the fixture list, shows panel stats, and exports CSV', async ({
    context,
    extensionId,
    serviceWorker,
    fixtureServer
  }) => {
    const beatportPage = await context.newPage()
    await beatportPage.goto(fixtureServer.chartUrl, {
      waitUntil: 'domcontentloaded'
    })

    const tabId = await serviceWorker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        url: '*://*.beatport.com/*'
      })
      return tab?.id ?? null
    })
    expect(tabId, 'Beatport fixture tab id').toEqual(expect.any(Number))

    const snapshot = await waitForSnapshot(serviceWorker, tabId!)
    expect(snapshot.trackCount).toBe(3)
    expect(snapshot.listCount).toBe(100)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.tracks?.map(track => track.title)).toEqual(
      expect.arrayContaining(['Night Drive', 'Warehouse Pulse', 'Late Signal'])
    )

    const panel = await context.newPage()
    await panel.goto(
      `chrome-extension://${extensionId}/sidepanel.html?tab=${tabId}`
    )

    await expect(panel.locator('.header-brand > .eyebrow')).toHaveText(
      'Beatport Analyst'
    )
    await expect(
      panel.getByRole('heading', { name: 'Tech House Top 100' })
    ).toBeVisible()
    await expect(panel.locator('.header-card .muted')).toContainText(
      '3 tracks from'
    )
    await expect(
      panel.getByRole('heading', { name: 'Market Brief' })
    ).toBeVisible()
    await expect(panel.locator('.chart-header .muted')).toHaveText(
      'Based on 3 of 100 tracks'
    )

    const tracksTable = panel.locator('.table-wrap table')
    await expect(
      tracksTable.getByText('Night Drive', { exact: true })
    ).toBeVisible()
    await expect(
      tracksTable.getByText('Warehouse Pulse', { exact: true })
    ).toBeVisible()
    await expect(
      tracksTable.getByText('Late Signal', { exact: true })
    ).toBeVisible()

    const downloadPromise = panel.waitForEvent('download')
    await panel.getByRole('button', { name: 'Export CSV' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const csv = readFileSync(downloadPath!, 'utf8')
    expect(csv).toContain('Night Drive')
    expect(csv).toContain('Warehouse Pulse')
    expect(csv).toContain('Late Signal')
    expect(csv).toContain('Extended Mix')
  })
})
