import { afterEach, beforeEach, vi } from 'vitest'

// 12:00 noon in Manila on Monday 21 Sep 2026 (04:00 UTC). Every date rule in the app
// is relative to "today in Manila", so tests pin the clock instead of drifting.
export const NOW = '2026-09-21T04:00:00.000Z'
export const TODAY = '2026-09-21'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW))
})
afterEach(() => {
  vi.useRealTimers()
})
