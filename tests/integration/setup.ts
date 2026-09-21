// Integration tests run against the REAL Supabase project in .env.local (there is only
// one), using throwaway accounts whose emails end in @example.test, cleaned up after each
// file. They never touch real data, but they do write to the live database, so they are
// opt-in: set RUN_INTEGRATION=1 (the `npm run test:integration` script does this).
// If a run is killed half way, `npm run test:sweep` removes whatever it left behind.
import { beforeAll } from 'vitest'

try {
  process.loadEnvFile('.env.local')
} catch {
  // variables may already be set (CI)
}

beforeAll(() => {
  if (process.env.RUN_INTEGRATION !== '1') {
    throw new Error('Integration tests write to the live Supabase project. Run them with `npm run test:integration` (sets RUN_INTEGRATION=1).')
  }
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key]) throw new Error(`${key} is not set (see .env.local).`)
  }
})
