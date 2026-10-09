import { describe, expect, it } from 'vitest'
import { formatManilaDate, formatManilaTime, manilaDateKey } from '@/lib/pickup-history'

describe('pickup history times are Manila time', () => {
  it('shows 15:05 UTC+8 for 07:05 UTC', () => {
    expect(formatManilaTime('2026-10-09T07:05:00Z')).toBe('3:05 PM')
    expect(formatManilaDate('2026-10-09T07:05:00Z')).toBe('Friday, October 9, 2026')
  })
  it('a pickup late in the UTC day falls on the next Manila day', () => {
    expect(manilaDateKey('2026-10-09T17:30:00Z')).toBe('2026-10-10')
    expect(formatManilaTime('2026-10-09T17:30:00Z')).toBe('1:30 AM')
  })
})
