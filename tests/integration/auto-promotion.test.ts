import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'
import { runAutoPromotions } from '@/lib/auto-promotion'
import { todayIso } from '@/lib/format'

// The daily auto-promotion against the real project, limited to throwaway
// students (studentIds) so a run never touches real children. Needs
// 20261009130000_students_lock_allows_service_role.sql: without it the students
// lock refuses the service-role class change.
const f = new Fixture()
let parent: TestUser
let classroomIds: Record<string, string> = {}

// A date of birth exactly `months` whole months before today.
function dobMonthsAgo(months: number): string {
  const [y, m, d] = todayIso().split('-').map(Number)
  const total = y * 12 + (m - 1) - months
  const day = Math.min(d, 28)
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const fees = async (studentId: string) =>
  (await f.admin.from('payments').select('classroom_id, fee_type, amount, status').eq('student_id', studentId)).data ?? []

beforeAll(async () => {
  parent = await f.user('parent', 'autopromo')
  const { data } = await f.admin.from('classrooms').select('id, slug')
  classroomIds = Object.fromEntries((data ?? []).map((c) => [c.slug, c.id]))
}, 60_000)

afterAll(async () => {
  await f.admin.from('applications').delete().like('parent_email', 'zz-test-%@example.test')
  await f.cleanup()
})

describe('runAutoPromotions', () => {
  it('moves a child who outgrew Little Explorers, adds the new fees and keeps the old ones', async () => {
    const studentId = await f.student(parent, { date_of_birth: dobMonthsAgo(26), classroom_id: classroomIds['little-explorers'], enrollment_status: 'active' })
    // An existing, part-paid-looking old fee that must survive untouched.
    const { error: oldFeeError } = await f.admin.from('payments').insert({
      student_id: studentId,
      classroom_id: classroomIds['little-explorers'],
      fee_type: 'tuition',
      description: 'Little Explorers: Tuition',
      amount: 1000,
      status: 'pending',
    })
    expect(oldFeeError).toBeNull()

    const summary = await runAutoPromotions({ admin: f.admin, today: todayIso(), studentIds: [studentId] })
    expect(summary.errors).toEqual([])
    expect(summary.promoted).toHaveLength(1)

    const { data: student } = await f.admin.from('students').select('classroom_id').eq('id', studentId).single()
    expect(student?.classroom_id).toBe(classroomIds['advanced-toddler'])

    const rows = await fees(studentId)
    expect(rows.filter((r) => r.classroom_id === classroomIds['little-explorers'])).toHaveLength(1)
    expect(rows.filter((r) => r.classroom_id === classroomIds['advanced-toddler']).length).toBeGreaterThan(0)

    const { data: notes } = await f.admin.from('notifications').select('title').eq('user_id', parent.id)
    expect((notes ?? []).some((n) => n.title.includes('Advanced Toddler'))).toBe(true)

    // A second run changes nothing and adds no fees.
    const again = await runAutoPromotions({ admin: f.admin, today: todayIso(), studentIds: [studentId] })
    expect(again.promoted).toHaveLength(0)
    expect((await fees(studentId)).length).toBe(rows.length)
  })

  it('leaves a child who still fits, a withdrawn child and a Tutorial student alone', async () => {
    const fits = await f.student(parent, { date_of_birth: dobMonthsAgo(20), classroom_id: classroomIds['little-explorers'], enrollment_status: 'active' })
    const withdrawn = await f.student(parent, { date_of_birth: dobMonthsAgo(30), classroom_id: classroomIds['little-explorers'], enrollment_status: 'withdrawn' })
    const tutorial = await f.student(parent, { date_of_birth: dobMonthsAgo(120), classroom_id: classroomIds['academic-tutorials'], enrollment_status: 'active' })

    const summary = await runAutoPromotions({ admin: f.admin, today: todayIso(), studentIds: [fits, withdrawn, tutorial] })
    expect(summary).toEqual({ promoted: [], errors: [] })
    for (const id of [fits, withdrawn, tutorial]) expect(await fees(id)).toEqual([])
  })
})
