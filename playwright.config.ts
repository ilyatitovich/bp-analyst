import { defineConfig } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf8')
) as { version: string }

const extensionPath = join(rootDir, `.output/chrome-mv3-${version}`)

if (!existsSync(extensionPath)) {
  throw new Error(
    `Chrome extension build missing at ${extensionPath}. Run \`pnpm build:chrome\` before \`pnpm test:e2e\`.`
  )
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    trace: 'on-first-retry',
    actionTimeout: 10_000
  }
})
