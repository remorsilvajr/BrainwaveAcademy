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

// A date of birth that is exactly `months` whole months old on the pinned
// today (2026-09-21), plus 6 days into the next month so it is unambiguous.
const dobMonths = (months: number) => {
  const d = new Date(Date.UTC(2026, 8 - months, 15))
  return d.toISOString().slice(0, 10)
}

describe('program age ranges (whole months, inclusive)', () => {
  const LE = { min_age_months: 18, max_age_months: 24 }
  const AT = { min_age_months: 25, max_age_months: 34 }
  const NSE = { min_age_months: 35, max_age_months: 46 }
  const PK = { min_age_months: 47, max_age_months: 58 }
  const open = { min_age_months: null, max_age_months: null }

  it('Little Explorers is 1y 6m to 2y 0m, Advanced Toddler starts at 2y 1m with no gap', () => {
    for (const [months, le, at] of [
      [17, false, false],
      [18, true, false],
      [24, true, false], // 2y 0m (and up to 2y 0m 29d)
      [25, false, true], // 2y 1m
      [34, false, true], // 2y 10m
      [35, false, false], // 2y 11m is Nursery
    ] as const) {
      expect(isAgeEligibleForClassroom(dobMonths(months), LE), `LE ${months}m`).toBe(le)
      expect(isAgeEligibleForClassroom(dobMonths(months), AT), `AT ${months}m`).toBe(at)
    }
  })
  it('Nursery is 2y 11m to 3y 10m and Pre-Kindergarten 3y 11m to 4y 10m', () => {
    expect(isAgeEligibleForClassroom(dobMonths(35), NSE)).toBe(true)
    expect(isAgeEligibleForClassroom(dobMonths(46), NSE)).toBe(true)
    expect(isAgeEligibleForClassroom(dobMonths(47), NSE)).toBe(false)
    expect(isAgeEligibleForClassroom(dobMonths(47), PK)).toBe(true)
    expect(isAgeEligibleForClassroom(dobMonths(58), PK)).toBe(true)
    expect(isAgeEligibleForClassroom(dobMonths(59), PK)).toBe(false)
  })
  it('a child one day short of the first month is not eligible yet', () => {
    // exactly 18 months old today is the earliest
    expect(isAgeEligibleForClassroom('2025-03-21', LE)).toBe(true)
    expect(isAgeEligibleForClassroom('2025-03-22', LE)).toBe(false)
    // 2y 1m starts on the 21st
    expect(isAgeEligibleForClassroom('2024-08-21', AT)).toBe(true)
    expect(isAgeEligibleForClassroom('2024-08-22', AT)).toBe(false)
  })
  it('a program with no range takes anyone, and has a label saying so', () => {
    expect(isAgeEligibleForClassroom(dobMonths(108), open)).toBe(true)
    expect(classroomAgeRangeLabel(open)).toBe('All ages')
  })
  it('labels read as years and months', () => {
    expect(classroomAgeRangeLabel(LE)).toBe('Ages 1 yr 6 mo - 2 yrs')
    expect(classroomAgeRangeLabel(AT)).toBe('Ages 2 yrs 1 mo - 2 yrs 10 mo')
    expect(classroomAgeRangeLabel(NSE)).toBe('Ages 2 yrs 11 mo - 3 yrs 10 mo')
    expect(classroomAgeRangeLabel(PK)).toBe('Ages 3 yrs 11 mo - 4 yrs 10 mo')
  })
  it('a support program 5-18 (60-227 months) takes a 15-year-old but not a 4-year-old, and reads "Ages 5-18"', () => {
    const support = { min_age_months: 60, max_age_months: 227 }
    expect(isAgeEligibleForClassroom(dobMonths(15 * 12), support)).toBe(true)
    expect(isAgeEligibleForClassroom(dobMonths(4 * 12), support)).toBe(false)
    expect(isAgeEligibleForClassroom(dobMonths(18 * 12 + 11), support)).toBe(true)
    expect(isAgeEligibleForClassroom(dobMonths(19 * 12), support)).toBe(false)
    expect(classroomAgeRangeLabel(support)).toBe('Ages 5-18')
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
  const room = (slug: string, min: number | null, max: number | null): LadderClassroom => ({ id: `id-${slug}`, name: slug, slug, min_age_months: min, max_age_months: max })
  const classrooms = [
    room('smart-explorers', 35, 46),
    room('advanced-toddler', 25, 34),
    room('little-explorers', 18, 24),
    room('curious-adventurers', 47, 58),
    room('academic-tutorials', 60, 227),
  ]
  const ladder = ladderClassrooms(classrooms)

  it('the ladder is in the fixed order regardless of how the rows come back', () => {
    expect(ladder.map((c) => c.slug)).toEqual([...PROMOTION_LADDER])
  })
  it('each step goes to the next program and the last graduates', () => {
    const pick = (slug: string, months = 30) => suggestChoice({ date_of_birth: dobMonths(months), classroomSlug: slug }, ladder).choice
    expect(pick('little-explorers')).toBe('id-advanced-toddler')
    expect(pick('advanced-toddler', 40)).toBe('id-smart-explorers')
    expect(pick('smart-explorers', 50)).toBe('id-curious-adventurers')
    expect(pick('curious-adventurers', 70)).toBe(CHOICE_GRADUATE)
  })
  it('a support program or no program stays', () => {
    expect(suggestChoice({ date_of_birth: dobMonths(96), classroomSlug: 'academic-tutorials' }, ladder).choice).toBe(CHOICE_STAY)
    expect(suggestChoice({ date_of_birth: dobMonths(48), classroomSlug: null }, ladder).choice).toBe(CHOICE_STAY)
  })
  it('a child too old for the next program stays, with a note saying why', () => {
    const r = suggestChoice({ date_of_birth: dobMonths(96), classroomSlug: 'little-explorers' }, ladder)
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
