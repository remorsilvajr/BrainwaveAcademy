import { describe, expect, it } from 'vitest'
import { firstNameProblem, isValidName, nameProblem } from '@/lib/name'

describe('nameProblem names only the rule that is broken', () => {
  it('passes good names', () => {
    for (const n of ['Ana', "O'Brien", 'Mary-Jane', 'De la Cruz', 'José']) {
      expect(nameProblem(n)).toBeNull()
      expect(isValidName(n)).toBe(true)
    }
  })
  it('says the short thing for each problem', () => {
    expect(nameProblem('A')).toBe('Names must be at least 2 characters.')
    expect(nameProblem('Ana 2')).toBe('Use letters only.')
    expect(nameProblem('Ana!')).toBe('Use letters only.')
    expect(nameProblem('Ana  Maria')).toBe('Use a single space between words.')
    expect(nameProblem('Ana\tMaria')).toBe('Use a single space between words.')
    expect(nameProblem("Ana'")).toContain('between letters')
    expect(nameProblem('Ana--Maria')).toContain('between letters')
  })
  it('agrees with isValidName on every case', () => {
    for (const n of ['A', 'Ana 2', 'Ana  Maria', "'a", 'a--b', '---', 'Ana', 'Mary-Jane']) {
      expect(nameProblem(n) === null).toBe(isValidName(n))
    }
  })
  it('firstNameProblem skips empty optional names and reports the first real one', () => {
    expect(firstNameProblem('Ana', '', 'Cruz')).toBeNull()
    expect(firstNameProblem('Ana', 'M2', 'Cruz')).toBe('Use letters only.')
  })
})

describe('dobProblem names only the broken date rule (today pinned to 2026-09-21)', () => {
  it('says the short thing for each problem', async () => {
    const { dobProblem } = await import('@/lib/dob')
    expect(dobProblem('2023-02-30', 'Student', 1.5, 18)).toBe('Please enter a valid date of birth.')
    expect(dobProblem('2027-01-01', 'Student', 1.5, 18)).toBe("The date of birth can't be in the future.")
    expect(dobProblem('2025-09-21', 'Student', 1.5, 18)).toBe('Student must be at least 1 year 6 months old.')
    expect(dobProblem('2010-01-01', 'You', 18, 100)).toBe('You must be at least 18 years old.')
    expect(dobProblem('2000-01-01', 'Student', 1.5, 18)).toBe('Student must be 18 years old or younger.')
    expect(dobProblem('2022-01-01', 'Student', 1.5, 18)).toBeNull()
  })
  it('always agrees with isValidDob', async () => {
    const { dobProblem, isValidDob } = await import('@/lib/dob')
    for (const d of ['2023-02-30', '2027-01-01', '2025-09-21', '2025-03-21', '2025-03-22', '2007-09-21', '2007-09-22', '2022-01-01', 'garbage']) {
      expect(dobProblem(d, 'Student', 1.5, 18) === null).toBe(isValidDob(d, { minAge: 1.5, maxAge: 18 }))
    }
  })
})

describe('phone and "Other" relationship messages name only the problem', () => {
  it('phone', async () => {
    const { phoneMessage } = await import('@/lib/phone')
    expect(phoneMessage('0917abc4567')).toBe('Use digits only.')
    expect(phoneMessage('+1 415 555 0100')).toBe('A Philippine number starts with +63 or 0.')
    expect(phoneMessage('0817 123 4567')).toBe('A mobile number starts with 9 after the 0 or +63.')
    expect(phoneMessage('0917 123 45')).toBe('A mobile number has 10 digits after the 0 or +63 (this has 8).')
  })
  it('"Other" relationship', async () => {
    const { otherSpecProblem } = await import('@/lib/pickup-relationships')
    expect(otherSpecProblem('')).toBe('Please specify the relationship.')
    expect(otherSpecProblem('N')).toBe('Use at least 2 letters.')
    expect(otherSpecProblem('x'.repeat(41))).toBe('Keep it to 40 characters or fewer.')
    expect(otherSpecProblem('Neighbor 2')).toBe('Use letters only.')
    expect(otherSpecProblem('Neighbor')).toBeNull()
  })
})
