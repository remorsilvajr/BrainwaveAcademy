import { describe, expect, it } from 'vitest'
import { formErrorBanner } from '@/lib/form-errors'

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
