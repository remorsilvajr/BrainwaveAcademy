import { describe, expect, it } from 'vitest'
import { autoPromotionTarget } from '@/lib/auto-promotion'

// The real ranges (whole months, both ends inclusive).
const ladder = [
  { id: 'le', name: 'Little Explorers', slug: 'little-explorers', min_age_months: 18, max_age_months: 24 },
  { id: 'at', name: 'Advanced Toddler', slug: 'advanced-toddler', min_age_months: 25, max_age_months: 34 },
  { id: 'se', name: 'Smart Explorers', slug: 'smart-explorers', min_age_months: 35, max_age_months: 46 },
  { id: 'ca', name: 'Curious Adventurers', slug: 'curious-adventurers', min_age_months: 47, max_age_months: 58 },
]
const today = '2026-09-21'

describe('autoPromotionTarget', () => {
  it('leaves a child who still fits their class (24 months in Little Explorers)', () => {
    expect(autoPromotionTarget('2024-09-21', 'little-explorers', ladder, today)).toBeNull()
  })
  it('moves a child the day they outgrow it (25 months -> Advanced Toddler)', () => {
    expect(autoPromotionTarget('2024-08-21', 'little-explorers', ladder, today)?.slug).toBe('advanced-toddler')
  })
  it('does not count a month that is not yet complete', () => {
    expect(autoPromotionTarget('2024-08-22', 'little-explorers', ladder, today)).toBeNull()
  })
  it('moves a child who fell behind straight to the class that fits (36 months -> Smart Explorers)', () => {
    expect(autoPromotionTarget('2023-09-21', 'little-explorers', ladder, today)?.slug).toBe('smart-explorers')
  })
  it('never moves a child out of the last class (graduating is the admin decision)', () => {
    expect(autoPromotionTarget('2021-09-21', 'curious-adventurers', ladder, today)).toBeNull()
  })
  it('ignores Tutorial / Quiz Bee and children with no class', () => {
    expect(autoPromotionTarget('2015-01-01', 'academic-tutorials', ladder, today)).toBeNull()
    expect(autoPromotionTarget('2024-01-01', null, ladder, today)).toBeNull()
  })
  it('never moves a child down', () => {
    expect(autoPromotionTarget('2025-01-21', 'advanced-toddler', ladder, today)).toBeNull()
  })
})
