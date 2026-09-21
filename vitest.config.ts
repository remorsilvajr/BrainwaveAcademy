import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Fast, database-free unit tests: the pure rules in lib/ (validation, money, ages,
// dates, matching). `npm test`. Integration tests that touch the real database live
// under tests/integration and use their own config (see vitest.integration.config.ts).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
  },
})
