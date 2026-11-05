import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/perf/**/*.bench.ts'],
    // Benches write docs; keep them out of the default `pnpm test` suite.
    testTimeout: 60_000
  }
})
