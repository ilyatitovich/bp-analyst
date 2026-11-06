import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Regenerates docs/screenshots — set CAPTURE_SCREENSHOTS=1 when running
  // e2e/screenshots.spec.ts so it is not ignored by the default suite.
  testIgnore: process.env.CAPTURE_SCREENSHOTS ? [] : ['**/screenshots.spec.ts'],
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
