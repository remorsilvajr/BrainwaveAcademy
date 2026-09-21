import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Integration tests run real queries against the Supabase project in .env.local,
// as throwaway users, and clean up after themselves. They are deliberately NOT part
// of `npm test`; run them with `npm run test:integration` (see tests/README.md).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    env: { RUN_INTEGRATION: '1' },
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // One file at a time: they share one database and clean up by prefix.
    fileParallelism: false,
  },
})
