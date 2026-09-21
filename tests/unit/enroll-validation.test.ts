import { describe, expect, it } from 'vitest'
import { validateEnrollField, validateEnrollFields, STUDENT_KEYS } from '@/lib/enroll-validation'

const classrooms = [
  { id: 'le', min_age_months: 18, max_age_months: 24 },
  { id: 'tut', min_age_months: 60, max_age_months: 227 },
]

describe('enroll form live validation (mirrors the server checks)', () => {
  it('requires the required fields and leaves the optional ones alone', () => {
    expect(validateEnrollField('student_first_name', {})).toBe('Student first name is required.')
    expect(validateEnrollField('student_middle_name', {})).toBeUndefined()
    expect(validateEnrollField('parent_gender', {})).toBeUndefined()
  })
  it('can leave "is required" out so blank fields are only flagged on submit', () => {
    const live = { includeRequired: false }
    expect(validateEnrollField('student_first_name', {}, [], live)).toBeUndefined()
    expect(validateEnrollField('requested_classroom_id', {}, [], live)).toBeUndefined()
    expect(validateEnrollField('password', { password: '' }, [], live)).toBeUndefined()
    expect(validateEnrollField('confirm_password', { password: 'Abcdefg1', confirm_password: '' }, [], live)).toBeUndefined()
    expect(validateEnrollFields(STUDENT_KEYS, {}, [], live)).toEqual({})
    // a wrong value is still flagged live
    expect(validateEnrollField('student_first_name', { student_first_name: 'A1' }, [], live)).toMatch(/Names must/)
    expect(validateEnrollField('password', { password: 'abc' }, [], live)).toMatch(/must be at least 8/)
  })
  it('rejects a bad name, email and phone', () => {
    expect(validateEnrollField('student_first_name', { student_first_name: 'A1' })).toMatch(/Names must/)
    expect(validateEnrollField('student_middle_name', { student_middle_name: '---' })).toMatch(/Names must/)
    expect(validateEnrollField('parent_email', { parent_email: 'a@b..c' })).toMatch(/valid email/)
    expect(validateEnrollField('parent_contact_number', { parent_contact_number: '12345' })).toMatch(/PH mobile/)
    expect(validateEnrollField('parent_contact_number', { parent_contact_number: '0917 123 4567' })).toBeUndefined()
  })
  it('checks the student age range (1y 6m to 18y) and a parent 10+ years older', () => {
    expect(validateEnrollField('student_dob', { student_dob: '2026-01-01' })).toMatch(/between 1 year 6 months and 18/)
    expect(validateEnrollField('student_dob', { student_dob: '2024-09-01' })).toBeUndefined()
    expect(validateEnrollField('parent_dob', { parent_dob: '2020-01-01' })).toMatch(/between 18 and 100/)
    expect(validateEnrollField('parent_dob', { parent_dob: '2010-01-01', student_dob: '2024-09-01' })).toMatch(/between 18 and 100/)
    expect(validateEnrollField('parent_dob', { parent_dob: '2010-01-01', student_dob: '2001-09-01' })).toBeDefined()
    expect(validateEnrollField('parent_dob', { parent_dob: '1990-01-01', student_dob: '2024-09-01' })).toBeUndefined()
    // 18 years old but only 8 years older than a 10-year-old
    expect(validateEnrollField('parent_dob', { parent_dob: '2008-01-01', student_dob: '2016-06-01' })).toMatch(/10 years older/)
  })
  it('a program that does not fit the student age is flagged', () => {
    const v = { student_dob: '2024-09-01', requested_classroom_id: 'tut' } // 24 months old today
    expect(validateEnrollField('requested_classroom_id', v, classrooms)).toMatch(/isn't available/)
    expect(validateEnrollField('requested_classroom_id', { ...v, requested_classroom_id: 'le' }, classrooms)).toBeUndefined()
    expect(validateEnrollField('requested_classroom_id', { student_dob: '2024-09-01' }, classrooms)).toMatch(/Program selection is required/)
  })
  it('password rules and the two-field match', () => {
    expect(validateEnrollField('password', { password: '' })).toBe('Password is required.')
    expect(validateEnrollField('password', { password: 'abc' })).toMatch(/must be at least 8/)
    expect(validateEnrollField('password', { password: 'Abcdefg1' })).toBeUndefined()
    expect(validateEnrollField('confirm_password', { password: 'Abcdefg1', confirm_password: 'Abcdefg2' })).toMatch(/do not match/)
    expect(validateEnrollField('confirm_password', { password: 'Abcdefg1', confirm_password: 'Abcdefg1' })).toBeUndefined()
  })
  it('validates a whole step at once', () => {
    const errors = validateEnrollFields(STUDENT_KEYS, { student_first_name: 'Emma', student_last_name: 'S' })
    expect(Object.keys(errors).sort()).toEqual(['student_dob', 'student_gender', 'student_last_name'])
  })
})
