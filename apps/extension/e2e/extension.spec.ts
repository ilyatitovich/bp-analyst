import { readFileSync } from 'node:fs'
import { expect, test } from './fixtures'
import { findBeatportTabId, waitForCoveredSnapshot } from './snapshot'

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

    const tabId = await findBeatportTabId(serviceWorker)
    expect(tabId, 'Beatport fixture tab id').toEqual(expect.any(Number))

    const snapshot = await waitForCoveredSnapshot(serviceWorker, tabId!)
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
      'BP Analyst'
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
