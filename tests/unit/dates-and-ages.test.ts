import { describe, expect, it } from 'vitest'
import {
  dobInputMax,
  dobInputMin,
  isRealIsoDate,
  isValidDob,
  MAX_STUDENT_AGE,
  MIN_ADULT_AGE,
  MIN_STUDENT_AGE,
  wholeMonthsOld,
  wholeYearsOld,
  ageInYearsLabel,
} from '@/lib/dob'
import { formatCurrency, isToday, roundToCents, todayIso } from '@/lib/format'
import { attendanceDateFromParam, monthFromParam } from '@/lib/date-params'
import { currentSchoolYear, isValidSchoolYear, schoolYearOptions } from '@/lib/school-year'
import { lastDayBounds, validateLastDay, validateReason } from '@/lib/unenrollment'
import { TODAY } from './setup'

describe('todayIso / Manila time', () => {
  it('is the Manila calendar date, not the UTC one', () => {
    expect(todayIso()).toBe(TODAY)
  })
  it('rolls over at midnight Manila (16:00 UTC), not midnight UTC', async () => {
    const { vi } = await import('vitest')
    vi.setSystemTime(new Date('2026-09-21T15:59:00Z'))
    expect(todayIso()).toBe('2026-09-21')
    vi.setSystemTime(new Date('2026-09-21T16:00:00Z'))
    expect(todayIso()).toBe('2026-09-22')
  })
  it('isToday follows the same rule', () => {
    expect(isToday(TODAY)).toBe(true)
    expect(isToday('2026-09-20')).toBe(false)
  })
})

describe('isRealIsoDate', () => {
  it.each(['2026-09-21', '2024-02-29', '2000-01-01'])('accepts %s', (v) => expect(isRealIsoDate(v)).toBe(true))
  it.each(['2023-02-30', '2023-02-29', '2023-04-31', '2023-13-01', '2023-1-5', '1/2/2023', 'March 5 2023', '', ' 2023-05-05', '2023-05-05T00:00'])(
    'rejects %j',
    (v) => expect(isRealIsoDate(v)).toBe(false)
  )
})

describe('wholeYearsOld', () => {
  it('counts the birthday on the day itself', () => {
    expect(wholeYearsOld('2020-05-10', '2023-05-10')).toBe(3)
    expect(wholeYearsOld('2020-05-10', '2023-05-09')).toBe(2)
  })
  it('handles a Feb 29 birth on non-leap years (birthday counts from 1 Mar)', () => {
    expect(wholeYearsOld('2020-02-29', '2023-02-28')).toBe(2)
    expect(wholeYearsOld('2020-02-29', '2023-03-01')).toBe(3)
  })
})

describe('wholeMonthsOld', () => {
  it('a month completes on the same day of the month', () => {
    expect(wholeMonthsOld('2025-03-21', '2026-09-21')).toBe(18)
    expect(wholeMonthsOld('2025-03-22', '2026-09-21')).toBe(17)
    expect(wholeMonthsOld('2026-09-21', '2026-09-21')).toBe(0)
  })
})

describe('ageInYearsLabel', () => {
  it('reads fractional years as years and months', () => {
    expect(ageInYearsLabel(1.5)).toBe('1 year 6 months')
    expect(ageInYearsLabel(2)).toBe('2 years')
    expect(ageInYearsLabel(18)).toBe('18 years')
  })
})

describe('isValidDob', () => {
  const student = { minAge: MIN_STUDENT_AGE, maxAge: MAX_STUDENT_AGE }
  it('students are 1 year 6 months to 18 years, both inclusive', () => {
    expect(isValidDob('2025-03-21', student)).toBe(true) // exactly 18 months today
    expect(isValidDob('2025-03-22', student)).toBe(false) // one day short of 18 months
    expect(isValidDob('2024-09-21', student)).toBe(true) // exactly 2
    expect(isValidDob('2007-09-22', student)).toBe(true) // 18y 364d
  })
  it('the maximum is inclusive up to the next birthday', () => {
    // 19th birthday is 2026-09-21 for a 2007-09-21 birth: age 19 > 18
    expect(isValidDob('2007-09-21', student)).toBe(false)
    expect(isValidDob('2007-09-22', student)).toBe(true)
  })
  it('rejects the future and impossible dates', () => {
    expect(isValidDob('2999-01-01', { minAge: 0 })).toBe(false)
    expect(isValidDob('2023-02-30', student)).toBe(false)
  })
  it('adults need 18+', () => {
    expect(isValidDob('2008-09-21', { minAge: MIN_ADULT_AGE })).toBe(true)
    expect(isValidDob('2008-09-22', { minAge: MIN_ADULT_AGE })).toBe(false)
  })
})

describe('DOB picker bounds', () => {
  it('latest date makes someone exactly minAge today; earliest is the oldest still allowed', () => {
    expect(dobInputMax(2)).toBe('2024-09-21')
    expect(dobInputMax(1.5)).toBe('2025-03-21')
    expect(dobInputMin(18)).toBe('2007-09-22')
  })
  it('a Feb 29 today falls back to Feb 28 in a non-leap target year', async () => {
    const { vi } = await import('vitest')
    vi.setSystemTime(new Date('2028-02-29T04:00:00Z'))
    expect(dobInputMax(3)).toBe('2025-02-28')
  })
})

describe('URL parameter sanitising', () => {
  it('attendance date falls back to today for anything malformed, future or impossible', () => {
    for (const bad of [undefined, '', 'abc', '2026-02-30', '2999-01-01', '2026-9-1']) expect(attendanceDateFromParam(bad)).toBe(TODAY)
    expect(attendanceDateFromParam('2026-01-15')).toBe('2026-01-15')
    expect(attendanceDateFromParam(TODAY)).toBe(TODAY)
  })
  it('month falls back to this month for anything malformed or absurd', () => {
    for (const bad of [undefined, 'abc-xyz', '2026-13', '2026-00', '99999-01', '2026', '1999-05']) expect(monthFromParam(bad)).toBe('2026-09')
    expect(monthFromParam('2026-03')).toBe('2026-03')
  })
})

describe('school years', () => {
  it('a new one starts in July, so June still belongs to the year that is ending', () => {
    expect(currentSchoolYear('2027-06-15')).toBe('2026-2027')
    expect(currentSchoolYear('2027-07-01')).toBe('2027-2028')
    expect(currentSchoolYear('2026-09-21')).toBe('2026-2027')
  })
  it('validates the second year is first + 1', () => {
    expect(isValidSchoolYear('2026-2027')).toBe(true)
    for (const bad of ['2026-2028', '26-27', '2026-2026', '1999-2000', '2101-2102', '']) expect(isValidSchoolYear(bad)).toBe(false)
  })
  it('offers last, current and next', () => {
    expect(schoolYearOptions('2026-09-21')).toEqual(['2025-2026', '2026-2027', '2027-2028'])
  })
})

describe('unenrollment rules', () => {
  it('last day: today through the end of next year', () => {
    expect(lastDayBounds()).toEqual({ min: '2026-09-21', max: '2027-12-31' })
    expect(validateLastDay('2026-09-21')).toBeNull()
    expect(validateLastDay('2027-12-31')).toBeNull()
    expect(validateLastDay('2026-09-20')).not.toBeNull()
    expect(validateLastDay('2028-01-01')).not.toBeNull()
    expect(validateLastDay('2027-02-30')).not.toBeNull()
  })
  it('reason: 5 to 1000 characters', () => {
    expect(validateReason('no')).not.toBeNull()
    expect(validateReason('We are moving away.')).toBeNull()
    expect(validateReason('x'.repeat(1001))).not.toBeNull()
  })
})

describe('money', () => {
  it('formats pesos with thousands separators and two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('₱1,234.50')
    expect(formatCurrency(0)).toBe('₱0.00')
  })
  it('rounds to centavos without float drift', () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3)
    expect(roundToCents(2500.1 - 2500)).toBe(0.1)
  })
})
