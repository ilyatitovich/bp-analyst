import {
  test as base,
  chromium,
  type BrowserContext,
  type Worker
} from '@playwright/test'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startFixtureServer, type FixtureServer } from './fixture-server'

const e2eDir = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(
  readFileSync(join(e2eDir, '../package.json'), 'utf8')
) as { version: string }

const extensionPath = join(e2eDir, `../.output/chrome-mv3-${version}`)

type ExtensionFixtures = {
  context: BrowserContext
  extensionId: string
  serviceWorker: Worker
  fixtureServer: FixtureServer
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature
  fixtureServer: async ({}, use) => {
    const server = await startFixtureServer()
    await use(server)
    await server.close()
  },

  context: async ({ fixtureServer }, use) => {
    // Depend on fixtureServer so Chromium only starts once Beatport MAP targets exist.
    if (!Number.isFinite(fixtureServer.port) || fixtureServer.port <= 0) {
      throw new Error('Beatport fixture server did not bind a port')
    }

    const userDataDir = await mkdtemp(join(tmpdir(), 'bp-analyst-e2e-'))
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        // Route Beatport hostnames to the local fixture server without editing /etc/hosts.
        '--host-resolver-rules=MAP www.beatport.com 127.0.0.1,MAP beatport.com 127.0.0.1,EXCLUDE localhost'
      ]
    })

    await use(context)
    await context.close()
    await rm(userDataDir, { recursive: true, force: true })
  },

  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    if (!worker) {
      worker = await context.waitForEvent('serviceworker')
    }
    await use(worker)
  },

  extensionId: async ({ serviceWorker }, use) => {
    const extensionId = serviceWorker.url().split('/')[2]
    if (!extensionId) {
      throw new Error(
        `Could not parse extension id from ${serviceWorker.url()}`
      )
    }
    await use(extensionId)
  }
})

export const expect = test.expect

export { extensionPath }
