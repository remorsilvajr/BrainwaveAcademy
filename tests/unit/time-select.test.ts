import { describe, expect, it } from 'vitest'
import { toParts, toValue } from '@/components/ui/time-select'

describe('time picker conversion', () => {
  it('reads 24-hour values (with or without seconds) as 12-hour parts', () => {
    expect(toParts('07:45')).toEqual({ hour: '7', minute: '45', period: 'AM' })
    expect(toParts('12:05:00')).toEqual({ hour: '12', minute: '05', period: 'PM' })
    expect(toParts('00:30')).toEqual({ hour: '12', minute: '30', period: 'AM' })
    expect(toParts('15:10')).toEqual({ hour: '3', minute: '10', period: 'PM' })
    expect(toParts('')).toEqual({ hour: '', minute: '', period: '' })
  })
  it('writes 12-hour parts back as 24-hour, only when complete', () => {
    expect(toValue('12', '00', 'AM')).toBe('00:00')
    expect(toValue('12', '00', 'PM')).toBe('12:00')
    expect(toValue('3', '10', 'PM')).toBe('15:10')
    expect(toValue('7', '45', 'AM')).toBe('07:45')
    expect(toValue('7', '', 'AM')).toBe('')
  })
})
