import { describe, expect, it } from 'vitest'
import { isValidEmail, normalizeEmail } from '@/lib/email-validation'
import { isValidPhilippineMobile, isValidPhoneInput, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, toTitleCase, NAME_HTML_PATTERN } from '@/lib/name'
import { validateFeeAmount, validateFeeDueDate, validateFeeReason } from '@/lib/fees'
import { isPickupRelationship, PICKUP_RELATIONSHIPS } from '@/lib/pickup-relationships'
import { pickupDisplayName } from '@/lib/pickup-names'

describe('email', () => {
  it.each(['a@b.co', 'first.last@school.edu.ph', 'x+tag@mail.example.com', "O'Brien@x.org", 'rsilva1@addu.edu.ph'])('accepts %s', (e) =>
    expect(isValidEmail(e)).toBe(true)
  )
  it.each(['a@b..c', 'a@b.c', 'a@.com', '@x.com', 'a@', 'a b@x.com', 'a@x', '.a@x.com', 'a.@x.com', 'a..b@x.com', 'a@-x.com', 'a@x-.com', 'a@@x.com', ''])(
    'rejects %j',
    (e) => expect(isValidEmail(e)).toBe(false)
  )
  it('enforces length limits', () => {
    expect(isValidEmail('x'.repeat(65) + '@x.com')).toBe(false)
    expect(isValidEmail('a@' + 'x'.repeat(250) + '.com')).toBe(false)
  })
  it('normalizes to trimmed lowercase', () => {
    expect(normalizeEmail('  Jane@X.COM ')).toBe('jane@x.com')
  })
})

describe('Philippine phone numbers', () => {
  it.each(['0917 123 4567', '+63 917 123 4567', '9171234567', '639171234567'])('accepts %s', (v) => expect(isValidPhoneInput(v)).toBe(true))
  it.each(['12345', '0917abc1234567', '+63 09171234567', '', '0817 123 4567'])('rejects %j as typed input', (v) => expect(isValidPhoneInput(v)).toBe(false))
  it('the lenient check strips junk, the input check does not', () => {
    expect(isValidPhilippineMobile('0917abc1234567')).toBe(true)
    expect(isValidPhoneInput('0917abc1234567')).toBe(false)
  })
  it('normalizes every accepted form to +63 XXX XXX XXXX', () => {
    for (const v of ['09171234567', '9171234567', '+63 917 123 4567', '639171234567']) expect(normalizePhilippineMobile(v)).toBe('+63 917 123 4567')
  })
})

describe('names', () => {
  it.each(['Ana', "O'Brien", 'Mary-Jane', 'Núñez', 'De la Cruz'])('accepts %s', (n) => expect(isValidName(n)).toBe(true))
  it.each(['A', '---', "''", '1234', 'Ana 2', '', '   '])('rejects %j', (n) => expect(isValidName(n)).toBe(false))
  it.each(["D'Angelo", "Mary-Jane O'Brien", 'Jo Ann', 'Ma Cristina Santos'])('accepts %s', (n) => expect(isValidName(n)).toBe(true))
  it.each(['Ana  Maria', "a'", "'a", 'a-', '-a', "Ana' Maria", 'a--b', "a-'b", "a'-b", "O''Brien", 'Ana - Maria', "Ana '", 'Ana- Maria'])(
    'rejects malformed %j',
    (n) => expect(isValidName(n)).toBe(false)
  )
  it('the HTML pattern agrees with isValidName', () => {
    const re = new RegExp(`^(?:${NAME_HTML_PATTERN})$`, 'v')
    for (const n of ['Ana', "O'Brien", 'Mary-Jane', 'De la Cruz', 'Núñez']) expect(re.test(n)).toBe(true)
    for (const n of ['Ana  Maria', "a'", "'a", 'a--b', "a-'b", 'Ana 2']) expect(re.test(n)).toBe(false)
  })
  it('title-cases across spaces, hyphens and apostrophes', () => {
    expect(toTitleCase("mary-jane o'brien")).toBe("Mary-Jane O'Brien")
    expect(toTitleCase('JUAN DELA CRUZ')).toBe('Juan Dela Cruz')
  })
})

describe('fee correction rules', () => {
  it('reason is required (5 to 500 chars)', () => {
    expect(validateFeeReason('no')).not.toBeNull()
    expect(validateFeeReason('Recorded for the wrong child')).toBeNull()
    expect(validateFeeReason('x'.repeat(501))).not.toBeNull()
  })
  it('amount must be positive, finite and sane', () => {
    for (const bad of [0, -5, NaN, Infinity, 2_000_000]) expect(validateFeeAmount(bad)).not.toBeNull()
    expect(validateFeeAmount(0.01)).toBeNull()
    expect(validateFeeAmount(3500)).toBeNull()
  })
  it('due date may be past (that is what overdue is) but only within last year..next year', () => {
    expect(validateFeeDueDate(null)).toBeNull()
    expect(validateFeeDueDate('2026-01-10')).toBeNull()
    expect(validateFeeDueDate('2025-01-01')).toBeNull()
    expect(validateFeeDueDate('2027-12-31')).toBeNull()
    expect(validateFeeDueDate('2024-12-31')).not.toBeNull()
    expect(validateFeeDueDate('2028-01-01')).not.toBeNull()
    expect(validateFeeDueDate('2026-02-30')).not.toBeNull()
  })
})

describe('pickup helpers', () => {
  it('relationship must be from the fixed list', () => {
    for (const r of PICKUP_RELATIONSHIPS) expect(isPickupRelationship(r)).toBe(true)
    expect(isPickupRelationship('Boss')).toBe(false)
    expect(isPickupRelationship('mother')).toBe(false)
  })
  it('display name joins first, middle and last, skipping blanks', () => {
    expect(pickupDisplayName({ first_name: 'Ana', middle_name: null, last_name: 'Reyes' })).toBe('Ana Reyes')
    expect(pickupDisplayName({ first_name: 'Ana', middle_name: 'Marie', last_name: 'Reyes' })).toBe('Ana Marie Reyes')
    expect(pickupDisplayName({ first_name: 'Ana', middle_name: null, last_name: null })).toBe('Ana')
  })
})
