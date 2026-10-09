import { describe, expect, it } from 'vitest'
import { formatTime12, isValidTime, manilaTimeNow, toHHMM, validateAttendanceTimes } from '@/lib/attendance-times'
import { healthAlerts } from '@/lib/health'

describe('attendance times', () => {
  it('reads Manila time, not the server zone', () => {
    // 2026-09-21 23:30 UTC is 07:30 the next morning in Manila (UTC+8).
    expect(manilaTimeNow(new Date('2026-09-21T23:30:00Z'))).toBe('07:30')
    expect(manilaTimeNow(new Date('2026-09-21T16:05:00Z'))).toBe('00:05')
  })
  it('formats and trims database times', () => {
    expect(toHHMM('07:45:00')).toBe('07:45')
    expect(formatTime12('07:45:00')).toBe('7:45 AM')
    expect(formatTime12('12:05')).toBe('12:05 PM')
    expect(formatTime12('00:10')).toBe('12:10 AM')
    expect(formatTime12(null)).toBe('-')
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('7:45')).toBe(false)
  })
  const ok = (arrival: string | null, departure: string | null, status = 'present') => validateAttendanceTimes({ status, arrival, departure, now: '15:00' })
  it('accepts a normal day', () => {
    expect(ok('07:45', null)).toBeNull()
    expect(ok('07:45', '14:30')).toBeNull()
    expect(ok(null, null, 'absent')).toBeNull()
  })
  it('refuses impossible times', () => {
    expect(ok('16:00', null)).toMatch(/arrival time cannot be later than now/)
    expect(ok('07:45', '15:30')).toMatch(/departure time cannot be later than now/)
    expect(ok('09:00', '08:00')).toMatch(/before the arrival/)
    expect(ok(null, '14:00')).toMatch(/arrival time before/)
    expect(ok('07:45', null, 'absent')).toMatch(/absent/)
  })
})

describe('healthAlerts', () => {
  const none = { allergies: null, severe_allergy: false, medical_conditions: null, medications: null }
  it('flags a severe allergy first, then the rest', () => {
    expect(healthAlerts({ ...none, allergies: 'Peanuts', severe_allergy: true, medical_conditions: 'Asthma', medications: 'Inhaler' }).map((a) => a.kind)).toEqual([
      'severe',
      'medical',
      'medication',
    ])
  })
  it('a plain allergy is an allergy, and an empty record has no flags', () => {
    expect(healthAlerts({ ...none, allergies: 'Dust' })).toEqual([{ kind: 'allergy', label: 'Allergy', text: 'Dust' }])
    expect(healthAlerts({ ...none, allergies: '  ' })).toEqual([])
    expect(healthAlerts(null)).toEqual([])
  })
  it('a severe allergy with no description still shows', () => {
    expect(healthAlerts({ ...none, severe_allergy: true })[0].kind).toBe('severe')
  })
})
