import { describe, expect, it } from 'vitest'
import { formErrorBanner, joinLabels, missingFieldsMessage } from '@/lib/form-errors'

describe('formErrorBanner', () => {
  it('names the problem when exactly one field is wrong', () => {
    expect(formErrorBanner({ password: 'Your password cannot contain your name.' })).toBe('Your password cannot contain your name.')
  })

  it('stays generic when several fields are wrong', () => {
    expect(formErrorBanner({ password: 'Too short.', parent_email: 'Required.' })).toBe('Please fix the highlighted fields below.')
  })

  it('stays generic when there is nothing specific to say', () => {
    expect(formErrorBanner({})).toBe('Please fix the highlighted fields below.')
  })
})

describe('missingFieldsMessage', () => {
  it('names only the blank field', () => {
    expect(missingFieldsMessage([['First name', 'Ana'], ['Date of birth', ''], ['Gender', 'female']])).toBe('Date of birth is required.')
  })
  it('lists several blank fields', () => {
    expect(missingFieldsMessage([['First name', ''], ['Last name', ''], ['Gender', null]])).toBe('First name, Last name and Gender are required.')
  })
  it('is null when nothing is blank', () => {
    expect(missingFieldsMessage([['First name', 'Ana']])).toBeNull()
  })
})

describe('joinLabels', () => {
  it('joins one, two and three', () => {
    expect(joinLabels(['date of birth'])).toBe('date of birth')
    expect(joinLabels(['phone number', 'date of birth'])).toBe('phone number and date of birth')
    expect(joinLabels(['a', 'b', 'c'])).toBe('a, b and c')
  })
})
