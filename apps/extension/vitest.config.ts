import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // *.bench.ts is opt-in via `pnpm bench:extract` (rewrites docs/BENCHMARKS.md).
    include: ['__tests__/**/*.test.ts']
  }
})
