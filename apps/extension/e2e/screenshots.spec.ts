import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from './fixtures'
import { findBeatportTabId, waitForCoveredSnapshot } from './snapshot'

const docsScreenshots = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/screenshots'
)

test.describe('README screenshots', () => {
  test('capture side panel market brief and track table', async ({
    context,
    extensionId,
    serviceWorker,
    fixtureServer
  }) => {
    mkdirSync(docsScreenshots, { recursive: true })

    const beatportPage = await context.newPage()
    await beatportPage.goto(fixtureServer.chartUrl, {
      waitUntil: 'domcontentloaded'
    })

    const tabId = await findBeatportTabId(serviceWorker)
    expect(tabId).toEqual(expect.any(Number))
    await waitForCoveredSnapshot(serviceWorker, tabId!)

    const panel = await context.newPage()
    await panel.setViewportSize({ width: 420, height: 900 })
    await panel.goto(
      `chrome-extension://${extensionId}/sidepanel.html?tab=${tabId}`
    )
    await expect(
      panel.getByRole('heading', { name: 'Market Brief' })
    ).toBeVisible()

    await panel.screenshot({
      path: join(docsScreenshots, 'sidepanel-market-brief.png'),
      fullPage: false
    })

    const tracksTable = panel.locator('.table-wrap table').filter({
      has: panel.getByText('Night Drive', { exact: true })
    })
    await tracksTable.scrollIntoViewIfNeeded()
    await panel.screenshot({
      path: join(docsScreenshots, 'sidepanel-track-table.png'),
      fullPage: false
    })
  })
})
