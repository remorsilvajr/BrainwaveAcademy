import { describe, expect, it } from 'vitest'
import {
  classroomAgeRangeLabel,
  feeDueDateBounds,
  isAgeEligibleForClassroom,
  nonDailyClassroomIds,
  tracksDailyAttendance,
  validateFeeDueDate as validateProgramDueDate,
} from '@/lib/classrooms'
import { isOverdue, summarizeOutstanding } from '@/lib/payments'
import { ladderClassrooms, PROMOTION_LADDER, suggestChoice, CHOICE_GRADUATE, CHOICE_STAY, type LadderClassroom } from '@/lib/promotion'
import { isHourlyProgram, programOptionConfig, validateProgramOptions } from '@/lib/program-options'
import { isTerminalStudentStatus, TERMINAL_STATUS_FILTER } from '@/lib/student-status'
import {
  allergyAlert,
  healthInputFrom,
  matchDoNotRelease,
  nameKey,
  validateHealthInput,
  emptyHealthInput,
  type DoNotReleaseEntry,
} from '@/lib/health'

// birth date for a child who is `years` years and `months` months old on the pinned "today" (2026-09-21)
const dob = (years: number, months = 0) => {
  const d = new Date(Date.UTC(2026 - years, 8 - months, 15))
  return d.toISOString().slice(0, 10)
}

describe('program age ranges (whole years, inclusive)', () => {
  const LE = { min_age_years: 2, max_age_years: 3 }
  const AT = { min_age_years: 3, max_age_years: 4 }
  const open = { min_age_years: null, max_age_years: null }

  it('"Ages 2-3" takes a child up to their 4th birthday (the original off-by-one bug)', () => {
    for (const [y, m, expected] of [
      [2, 0, true],
      [2, 6, true],
      [3, 0, true],
      [3, 11, true],
      [4, 0, false],
      [1, 11, false],
    ] as const) {
      expect(isAgeEligibleForClassroom(dob(y, m), LE), `${y}y${m}m`).toBe(expected)
    }
  })
  it('"Ages 3-4" takes a 4-year-old; ranges may overlap', () => {
    expect(isAgeEligibleForClassroom(dob(4, 10), AT)).toBe(true)
    expect(isAgeEligibleForClassroom(dob(5, 0), AT)).toBe(false)
    expect(isAgeEligibleForClassroom(dob(3, 6), LE) && isAgeEligibleForClassroom(dob(3, 6), AT)).toBe(true)
  })
  it('a program with no range takes anyone, and has a label saying so', () => {
    expect(isAgeEligibleForClassroom(dob(9), open)).toBe(true)
    expect(classroomAgeRangeLabel(open)).toBe('All ages')
    expect(classroomAgeRangeLabel(LE)).toBe('Ages 2-3')
  })
  it('a support program 5-18 takes a 15-year-old but not a 4-year-old', () => {
    const support = { min_age_years: 5, max_age_years: 18 }
    expect(isAgeEligibleForClassroom(dob(15), support)).toBe(true)
    expect(isAgeEligibleForClassroom(dob(4), support)).toBe(false)
  })
})

describe('programs without daily attendance', () => {
  it('Tutorial and Quiz Bee are keyed by slug, everything else (and no program) is daily', () => {
    expect(tracksDailyAttendance({ slug: 'academic-tutorials' })).toBe(false)
    expect(tracksDailyAttendance({ slug: 'quiz-bee-exam-prep' })).toBe(false)
    expect(tracksDailyAttendance({ slug: 'little-explorers' })).toBe(true)
    expect(tracksDailyAttendance(null)).toBe(true)
  })
  it('collects the non-daily classroom ids', () => {
    const ids = nonDailyClassroomIds([
      { id: 'a', slug: 'academic-tutorials' },
      { id: 'b', slug: 'little-explorers' },
      { id: 'c', slug: 'quiz-bee-exam-prep' },
    ])
    expect([...ids].sort()).toEqual(['a', 'c'])
  })
})

describe('program due dates', () => {
  it('window is today through the end of next year, real dates only', () => {
    expect(feeDueDateBounds()).toEqual({ min: '2026-09-21', max: '2027-12-31' })
    expect(validateProgramDueDate('2026-09-21')).toBeNull()
    expect(validateProgramDueDate('2027-12-31')).toBeNull()
    for (const bad of ['2026-09-20', '2028-01-01', '2027-02-30', 'nope', '']) expect(validateProgramDueDate(bad)).not.toBeNull()
  })
})

describe('Tutorial and Quiz Bee options', () => {
  it('knows which programs are hourly and their rates', () => {
    expect(isHourlyProgram('academic-tutorials')).toBe(true)
    expect(isHourlyProgram('quiz-bee-exam-prep')).toBe(true)
    expect(isHourlyProgram('little-explorers')).toBe(false)
    expect(programOptionConfig('academic-tutorials')?.hourlyRate).toBe(150)
    expect(programOptionConfig('quiz-bee-exam-prep')?.hourlyRate).toBe(200)
  })
  it('requires at least one option, only from the fixed list, deduplicated in list order', () => {
    expect(validateProgramOptions('academic-tutorials', [])).toMatchObject({ ok: false })
    expect(validateProgramOptions('academic-tutorials', ['Math', 'Chess Competition'])).toMatchObject({ ok: false })
    expect(validateProgramOptions('academic-tutorials', ['English', ' Math ', 'Math'])).toEqual({ ok: true, options: ['Math', 'English'] })
  })
  it('a regular program ignores whatever was sent', () => {
    expect(validateProgramOptions('little-explorers', ['Math'])).toEqual({ ok: true, options: [] })
    expect(validateProgramOptions(null, ['Math'])).toEqual({ ok: true, options: [] })
  })
})

describe('outstanding balance and overdue (Manila today = 2026-09-21)', () => {
  it('a pending fee is overdue only once its due date has passed', () => {
    expect(isOverdue({ status: 'pending', due_date: '2026-09-20' })).toBe(true)
    expect(isOverdue({ status: 'pending', due_date: '2026-09-21' })).toBe(false)
    expect(isOverdue({ status: 'pending', due_date: null })).toBe(false)
    expect(isOverdue({ status: 'paid', due_date: '2020-01-01' })).toBe(false)
  })
  it('outstanding = pending only; waived, voided and paid never count', () => {
    const rows = [
      { amount: 1000, status: 'pending', due_date: '2026-09-01' },
      { amount: 500.25, status: 'pending', due_date: null },
      { amount: 700, status: 'paid', due_date: '2026-01-01' },
      { amount: 300, status: 'waived', due_date: '2026-01-01' },
      { amount: 200, status: 'voided', due_date: '2026-01-01' },
    ]
    expect(summarizeOutstanding(rows)).toEqual({ outstanding: 1500.25, overdue: 1000, outstandingCount: 2, overdueCount: 1 })
  })
  it('sums without float drift', () => {
    const rows = [0.1, 0.2, 0.3].map((amount) => ({ amount, status: 'pending', due_date: null }))
    expect(summarizeOutstanding(rows).outstanding).toBe(0.6)
  })
})

describe('student statuses', () => {
  it('only withdrawn and graduated are terminal', () => {
    expect(isTerminalStudentStatus('withdrawn')).toBe(true)
    expect(isTerminalStudentStatus('graduated')).toBe(true)
    for (const s of ['active', 'inactive', '', null, undefined]) expect(isTerminalStudentStatus(s as string)).toBe(false)
    expect(TERMINAL_STATUS_FILTER).toBe('(withdrawn,graduated)')
  })
})

describe('year-end promotion suggestions', () => {
  const room = (slug: string, min: number | null, max: number | null): LadderClassroom => ({ id: `id-${slug}`, name: slug, slug, min_age_years: min, max_age_years: max })
  const classrooms = [
    room('smart-explorers', null, null),
    room('advanced-toddler', 3, 4),
    room('little-explorers', 2, 3),
    room('curious-adventurers', null, null),
    room('academic-tutorials', 5, 18),
  ]
  const ladder = ladderClassrooms(classrooms)

  it('the ladder is in the fixed order regardless of how the rows come back', () => {
    expect(ladder.map((c) => c.slug)).toEqual([...PROMOTION_LADDER])
  })
  it('each step goes to the next program and the last graduates', () => {
    const pick = (slug: string, age = 3) => suggestChoice({ date_of_birth: dob(age), classroomSlug: slug }, ladder).choice
    expect(pick('little-explorers')).toBe('id-advanced-toddler')
    expect(pick('advanced-toddler', 4)).toBe('id-smart-explorers')
    expect(pick('smart-explorers', 5)).toBe('id-curious-adventurers')
    expect(pick('curious-adventurers', 6)).toBe(CHOICE_GRADUATE)
  })
  it('a support program or no program stays', () => {
    expect(suggestChoice({ date_of_birth: dob(8), classroomSlug: 'academic-tutorials' }, ladder).choice).toBe(CHOICE_STAY)
    expect(suggestChoice({ date_of_birth: dob(4), classroomSlug: null }, ladder).choice).toBe(CHOICE_STAY)
  })
  it('a child too old for the next program stays, with a note saying why', () => {
    const r = suggestChoice({ date_of_birth: dob(8), classroomSlug: 'little-explorers' }, ladder)
    expect(r.choice).toBe(CHOICE_STAY)
    expect(r.note).toContain('advanced-toddler')
  })
})

describe('health input', () => {
  const base = { ...emptyHealthInput }
  it('cleans and normalizes a valid record', () => {
    const r = validateHealthInput({ ...base, allergies: 'Peanuts', severeAllergy: true, doctorPhone: '09171234567', contacts: [{ fullName: 'ana reyes', relationship: 'Aunt', phoneNumber: '0917 555 1234' }] })
    expect('value' in r && r.value.contacts[0]).toEqual({ fullName: 'Ana Reyes', relationship: 'Aunt', phoneNumber: '+63 917 555 1234' })
    expect('value' in r && r.value.doctorPhone).toBe('+63 917 123 4567')
  })
  it.each([
    ['a severe allergy with no description', { severeAllergy: true }],
    ['text over 500 characters', { allergies: 'x'.repeat(501) }],
    ['more than 3 contacts', { contacts: ['Ana', 'Ben', 'Cy', 'Di'].map((fullName) => ({ fullName, relationship: 'Aunt', phoneNumber: '09171234567' })) }],
    ['a bad contact phone', { contacts: [{ fullName: 'Ana Reyes', relationship: 'Aunt', phoneNumber: '12345' }] }],
    ['a relationship outside the list', { contacts: [{ fullName: 'Ana Reyes', relationship: 'Boss', phoneNumber: '09171234567' }] }],
    ['a contact name with digits', { contacts: [{ fullName: 'Ana 123', relationship: 'Aunt', phoneNumber: '09171234567' }] }],
  ])('refuses %s', (_label, over) => {
    expect('error' in validateHealthInput({ ...base, ...over })).toBe(true)
  })
  it('ignores fully blank contact rows and round-trips through healthInputFrom', () => {
    expect('value' in validateHealthInput({ ...base, contacts: [{ fullName: '', relationship: '', phoneNumber: '' }] })).toBe(true)
    const input = healthInputFrom(
      { allergies: 'Peanuts', severe_allergy: true, medical_conditions: null, medications: null, doctor_name: null, doctor_phone: null, preferred_hospital: null, notes: null, updated_at: null },
      [
        { position: 2, full_name: 'Second', relationship: 'Aunt', phone_number: '+63 917 555 1234' },
        { position: 1, full_name: 'First', relationship: 'Uncle', phone_number: '+63 917 555 9999' },
      ]
    )
    expect(input.contacts.map((c) => c.fullName)).toEqual(['First', 'Second'])
    expect(input.severeAllergy).toBe(true)
  })
  it('allergy alerts are only for severe allergies and stay short', () => {
    expect(allergyAlert({ allergies: 'Peanuts', severe_allergy: true })).toBe('Peanuts')
    expect(allergyAlert({ allergies: 'Peanuts', severe_allergy: false })).toBeNull()
    expect(allergyAlert(null)).toBeNull()
    expect(allergyAlert({ allergies: 'x'.repeat(100), severe_allergy: true })).toHaveLength(60)
  })
})

describe('name matching and do-not-release', () => {
  const entries: DoNotReleaseEntry[] = [
    { id: '1', student_id: 's1', first_name: 'Juan', last_name: 'Dela Cruz', note: 'Court order' },
    { id: '2', student_id: 's2', first_name: 'Maria', last_name: 'Santos', note: null },
  ]
  it('nameKey ignores case, accents and punctuation', () => {
    expect(nameKey("  Núñez-O'Brien ")).toBe('nunez o brien')
    expect(nameKey(null)).toBe('')
  })
  it('an exact first + last match is a hard stop', () => {
    expect(matchDoNotRelease(entries, 'juan', 'DELA CRUZ').matches.map((d) => d.id)).toEqual(['1'])
    expect(matchDoNotRelease(entries, 'Juán', 'Dela  Cruz').matches).toHaveLength(1)
  })
  it('a fragment or a lone first name is only "similar"', () => {
    const fragment = matchDoNotRelease(entries, 'jua', 'dela')
    expect(fragment.matches).toHaveLength(0)
    expect(fragment.similar).toHaveLength(1)
    expect(matchDoNotRelease(entries, 'Maria', '').matches).toHaveLength(0)
    expect(matchDoNotRelease(entries, 'Maria', '').similar).toHaveLength(1)
  })
  it('nothing typed, or an unrelated name, matches nothing', () => {
    expect(matchDoNotRelease(entries, '', '')).toEqual({ matches: [], similar: [] })
    expect(matchDoNotRelease(entries, 'Pedro', 'Reyes')).toEqual({ matches: [], similar: [] })
  })
})
