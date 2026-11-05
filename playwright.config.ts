import { defineConfig } from '@playwright/test'

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
