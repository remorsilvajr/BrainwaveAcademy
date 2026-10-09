import { describe, expect, it } from 'vitest'
import { hasOutgrownFinalClass, isPendingCompletion, studentStatusLabel } from '@/lib/completion-rules'

const ca = { slug: 'curious-adventurers', max_age_months: 58 }
const today = '2026-09-21'

describe('completing preschool', () => {
  it('is due only past Curious Adventurers (58 months still fits, 59 is done)', () => {
    expect(hasOutgrownFinalClass('2021-11-21', ca, today)).toBe(false) // 58 months
    expect(hasOutgrownFinalClass('2021-10-21', ca, today)).toBe(true) // 59 months
  })
  it('never applies to another class or no class', () => {
    expect(hasOutgrownFinalClass('2015-01-01', { slug: 'academic-tutorials', max_age_months: 227 }, today)).toBe(false)
    expect(hasOutgrownFinalClass('2015-01-01', { slug: 'smart-explorers', max_age_months: 46 }, today)).toBe(false)
    expect(hasOutgrownFinalClass('2015-01-01', null, today)).toBe(false)
  })
  it('is pending only while something is owed by an active child', () => {
    const child = { enrollment_status: 'active', date_of_birth: '2021-01-01' }
    expect(isPendingCompletion(child, ca, 500, today)).toBe(true)
    expect(isPendingCompletion(child, ca, 0, today)).toBe(false)
    expect(isPendingCompletion({ ...child, enrollment_status: 'graduated' }, ca, 500, today)).toBe(false)
    expect(isPendingCompletion({ ...child, date_of_birth: '2022-06-01' }, ca, 500, today)).toBe(false)
  })
  it('shows the stored graduated status as Completed Preschool', () => {
    expect(studentStatusLabel('graduated')).toBe('Completed Preschool')
    expect(studentStatusLabel('active')).toBe('Active')
  })
})
