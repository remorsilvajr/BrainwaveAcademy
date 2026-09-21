import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applyYearEndDecisions } from '@/lib/year-end'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'
import { todayIso } from '@/lib/format'
import { CHOICE_GRADUATE, CHOICE_STAY } from '@/lib/promotion'
import { Fixture, type TestUser } from './helpers'

// Year-end promotion, run for real as a signed-in admin against the real classrooms
// (read only: only throwaway students are moved). A far-future school year keeps
// the history rows clear of anything real.
const YEAR = '2031-2032'
const f = new Fixture()
let admin: TestUser
let from: { id: string; name: string; tuition_fee: number; activity_fee: number; min_age_years: number | null; max_age_years: number | null }
let to: typeof from
let dob: string

const feeRowsPerProgram = (c: typeof from) => (c.tuition_fee > 0 ? 1 : 0) + (c.activity_fee > 0 ? 1 : 0)

// A birthday that puts a child in both programs' age range.
const dobEligibleForBoth = () => {
  const today = todayIso()
  for (let age = 2; age <= 8; age++) {
    const candidate = `${Number(today.slice(0, 4)) - age - 1}${today.slice(4)}`
    // one day past a whole birthday, so it is stable if the test runs across midnight
    const shifted = new Date(`${candidate}T00:00:00Z`)
    shifted.setUTCDate(shifted.getUTCDate() - 1)
    const iso = shifted.toISOString().slice(0, 10)
    if (isAgeEligibleForClassroom(iso, from) && isAgeEligibleForClassroom(iso, to)) return iso
  }
  throw new Error('No age fits both Little Explorers and Advanced Toddler: the age ranges changed, update this test.')
}

const child = (first: string, extra: Record<string, unknown> = {}) =>
  f.student(undefined, { first_name: first, date_of_birth: dob, classroom_id: from.id, enrollment_status: 'active', ...extra })
const one = async (table: string, studentId: string) => (await f.admin.from(table).select('*').eq('student_id', studentId)).data ?? []
const studentRow = async (id: string) => (await f.admin.from('students').select('classroom_id, enrollment_status').eq('id', id).single()).data!

beforeAll(async () => {
  const { data } = await f.admin
    .from('classrooms')
    .select('id, slug, name, tuition_fee, activity_fee, min_age_years, max_age_years')
    .in('slug', ['little-explorers', 'advanced-toddler'])
  from = data!.find((c) => c.slug === 'little-explorers')!
  to = data!.find((c) => c.slug === 'advanced-toddler')!
  dob = dobEligibleForBoth()
  admin = await f.user('admin')
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('applying the review', () => {
  it('promotes a child: new program, its fees once, history recorded, old fees kept', async () => {
    const id = await child('Promote')
    await f.admin.from('payments').insert({ student_id: id, classroom_id: from.id, amount: 100, fee_type: 'tuition', description: 'Old program fee', status: 'pending' })

    const result = await applyYearEndDecisions(admin.client, admin.id, YEAR, [{ studentId: id, choice: to.id }])
    expect(result).toMatchObject({ promoted: 1, failed: [] })

    expect((await studentRow(id)).classroom_id).toBe(to.id)
    const history = await one('student_promotions', id)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ school_year: YEAR, action: 'promoted', from_classroom_id: from.id, to_classroom_id: to.id, created_by: admin.id })

    const fees = await one('payments', id)
    expect(fees.filter((p) => p.classroom_id === to.id && p.status === 'pending')).toHaveLength(feeRowsPerProgram(to))
    expect(fees.filter((p) => p.description === 'Old program fee')).toHaveLength(1)
  })

  it('running the same review again moves nobody twice', async () => {
    const id = await child('Twice')
    const decisions = [{ studentId: id, choice: to.id }]
    await applyYearEndDecisions(admin.client, admin.id, YEAR, decisions)
    const again = await applyYearEndDecisions(admin.client, admin.id, YEAR, decisions)
    expect(again).toMatchObject({ promoted: 0, skipped: 1, failed: [] })
    expect(await one('student_promotions', id)).toHaveLength(1)
    expect((await one('payments', id)).filter((p) => p.classroom_id === to.id)).toHaveLength(feeRowsPerProgram(to))
  })

  it('records a child who stays, without changing anything else', async () => {
    const id = await child('Stay')
    const result = await applyYearEndDecisions(admin.client, admin.id, YEAR, [{ studentId: id, choice: CHOICE_STAY }])
    expect(result).toMatchObject({ stayed: 1, failed: [] })
    expect(await studentRow(id)).toEqual({ classroom_id: from.id, enrollment_status: 'active' })
    expect((await one('student_promotions', id))[0]).toMatchObject({ action: 'stayed', from_classroom_id: from.id, to_classroom_id: from.id })
    expect(await one('payments', id)).toHaveLength(0)
  })

  it('graduates a child: status changes, program kept as their last, unpaid fees stay owed', async () => {
    const id = await child('Graduate')
    await f.admin.from('payments').insert({ student_id: id, classroom_id: from.id, amount: 250, fee_type: 'tuition', description: 'Unpaid at graduation', status: 'pending' })
    const result = await applyYearEndDecisions(admin.client, admin.id, YEAR, [{ studentId: id, choice: CHOICE_GRADUATE }])
    expect(result).toMatchObject({ graduated: 1, failed: [] })
    expect(await studentRow(id)).toEqual({ classroom_id: from.id, enrollment_status: 'graduated' })
    expect((await one('payments', id))[0].status).toBe('pending')
    expect((await one('student_promotions', id))[0]).toMatchObject({ action: 'graduated', to_classroom_id: from.id })
  })

  it('reports a child who cannot be promoted and still applies everyone else', async () => {
    // Two years old: in range for Little Explorers, too young for Advanced Toddler.
    const youngDob = `${Number(todayIso().slice(0, 4)) - 2}-01-01`
    if (isAgeEligibleForClassroom(youngDob, to)) {
      throw new Error('A two-year-old now fits Advanced Toddler: the age ranges changed, update this test.')
    }
    const tooYoung = await child('TooYoung', { date_of_birth: youngDob })
    const fine = await child('Fine')

    const result = await applyYearEndDecisions(admin.client, admin.id, YEAR, [
      { studentId: tooYoung, choice: to.id },
      { studentId: fine, choice: to.id },
    ])
    if ('error' in result) throw new Error(result.error)
    expect(result.promoted).toBe(1)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].name).toBe('TooYoung Child')
    expect((await studentRow(tooYoung)).classroom_id).toBe(from.id)
    expect(await one('student_promotions', tooYoung)).toHaveLength(0)
    expect((await studentRow(fine)).classroom_id).toBe(to.id)
  })

  it('refuses a child who is no longer enrolled', async () => {
    const id = await child('Withdrawn', { enrollment_status: 'withdrawn' })
    const result = await applyYearEndDecisions(admin.client, admin.id, YEAR, [{ studentId: id, choice: to.id }])
    if ('error' in result) throw new Error(result.error)
    expect(result.failed).toEqual([{ name: 'Withdrawn Child', error: 'Not currently enrolled.' }])
    expect((await studentRow(id)).classroom_id).toBe(from.id)
  })

  it('refuses a destination that is not one of the promotion programs', async () => {
    const id = await child('BadChoice')
    const { data: tutorial } = await f.admin.from('classrooms').select('id').eq('slug', 'academic-tutorials').single()
    const result = await applyYearEndDecisions(admin.client, admin.id, YEAR, [
      { studentId: id, choice: tutorial!.id },
    ])
    if ('error' in result) throw new Error(result.error)
    expect(result.failed).toHaveLength(1)
    expect((await studentRow(id)).classroom_id).toBe(from.id)
    expect(await one('student_promotions', id)).toHaveLength(0)
  })
})

describe('the input is checked first', () => {
  it('rejects a bad school year, an empty review and a repeated student', async () => {
    const id = await child('Checks')
    expect(await applyYearEndDecisions(admin.client, admin.id, '2031', [{ studentId: id, choice: CHOICE_STAY }])).toEqual({ error: 'Choose a valid school year.' })
    expect(await applyYearEndDecisions(admin.client, admin.id, '2031-2033', [{ studentId: id, choice: CHOICE_STAY }])).toEqual({ error: 'Choose a valid school year.' })
    expect(await applyYearEndDecisions(admin.client, admin.id, YEAR, [])).toEqual({ error: 'There is nothing to apply.' })
    expect(
      await applyYearEndDecisions(admin.client, admin.id, YEAR, [
        { studentId: id, choice: CHOICE_STAY },
        { studentId: id, choice: CHOICE_GRADUATE },
      ])
    ).toEqual({ error: 'A student appears more than once.' })
    expect(await one('student_promotions', id)).toHaveLength(0)
  })

  it('a parent cannot run it', async () => {
    const parent = await f.user('parent', 'yearend')
    const id = await child('NotYours')
    const result = await applyYearEndDecisions(parent.client, parent.id, YEAR, [{ studentId: id, choice: CHOICE_GRADUATE }])
    // Whatever the wrapper reports, nothing about the child may change.
    void result
    expect(await studentRow(id)).toEqual({ classroom_id: from.id, enrollment_status: 'active' })
    expect(await one('student_promotions', id)).toHaveLength(0)
  })
})
