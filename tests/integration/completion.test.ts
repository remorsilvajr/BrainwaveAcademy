import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'
import { completeStudentIfReady, runCompletions } from '@/lib/completion'
import { loadCertificate } from '@/lib/certificate-load'
import { applyClassroomToStudent } from '@/lib/classroom-assignment'
import { todayIso } from '@/lib/format'

// Completing preschool against the real project, throwaway students only.
const f = new Fixture()
let parent: TestUser
let classroomIds: Record<string, string> = {}
const today = todayIso()

function dobMonthsAgo(months: number): string {
  const [y, m, d] = today.split('-').map(Number)
  const total = y * 12 + (m - 1) - months
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-${String(Math.min(d, 28)).padStart(2, '0')}`
}
const status = async (id: string) => (await f.admin.from('students').select('enrollment_status').eq('id', id).single()).data?.enrollment_status

beforeAll(async () => {
  parent = await f.user('parent', 'completion')
  const { data } = await f.admin.from('classrooms').select('id, slug')
  classroomIds = Object.fromEntries((data ?? []).map((c) => [c.slug, c.id]))
}, 60_000)

afterAll(async () => {
  await f.cleanup()
})

describe('completing preschool', () => {
  it('stays pending while a fee is owed, then completes once it is paid, with a certificate', async () => {
    const id = await f.student(parent, { date_of_birth: dobMonthsAgo(60), classroom_id: classroomIds['curious-adventurers'], enrollment_status: 'active' })
    const { data: fee, error } = await f.admin
      .from('payments')
      .insert({ student_id: id, classroom_id: classroomIds['curious-adventurers'], fee_type: 'tuition', description: 'Curious Adventurers: Tuition', amount: 1500, amount_paid: 500, status: 'pending' })
      .select('id')
      .single()
    expect(error).toBeNull()

    const run = await runCompletions({ admin: f.admin, today, studentIds: [id] })
    expect(run).toEqual({ completed: [], pending: [{ studentId: id, owed: 1000 }], errors: [] })
    expect(await status(id)).toBe('active')
    expect(await loadCertificate(f.admin, id)).toBeNull()

    expect((await f.admin.from('payments').update({ amount_paid: 1500, status: 'paid' }).eq('id', fee!.id)).error).toBeNull()
    expect(await completeStudentIfReady(f.admin, id, { today })).toEqual({ status: 'completed' })
    expect(await status(id)).toBe('graduated')

    const { data: record } = await f.admin.from('student_promotions').select('action, from_classroom_id').eq('student_id', id).single()
    expect(record).toEqual({ action: 'graduated', from_classroom_id: classroomIds['curious-adventurers'] })
    const { data: notes } = await f.admin.from('notifications').select('title').eq('user_id', parent.id)
    expect((notes ?? []).some((n) => n.title.includes('completed preschool'))).toBe(true)

    const certificate = await loadCertificate(f.admin, id)
    expect(certificate?.studentName).toBe('Test Child')
    expect(certificate?.programName).toBe('Curious Adventurers (Pre-Kindergarten)')

    // Done once: a second check changes nothing.
    expect((await completeStudentIfReady(f.admin, id, { today })).status).toBe('not-eligible')
    // And the class can no longer be changed (which would add fees).
    await expect(applyClassroomToStudent(f.admin, id, dobMonthsAgo(60), classroomIds['academic-tutorials'], ['Math'])).rejects.toThrow(/completed preschool/)
  })

  it('does not complete a child who still fits Curious Adventurers, unless an admin does it by hand', async () => {
    const id = await f.student(parent, { date_of_birth: dobMonthsAgo(50), classroom_id: classroomIds['curious-adventurers'], enrollment_status: 'active' })
    expect((await runCompletions({ admin: f.admin, today, studentIds: [id] })).completed).toEqual([])
    expect(await status(id)).toBe('active')
    expect(await completeStudentIfReady(f.admin, id, { today, manual: true })).toEqual({ status: 'completed' })
    expect(await status(id)).toBe('graduated')
  })

  it('never completes a child in another class, even by hand', async () => {
    const id = await f.student(parent, { date_of_birth: dobMonthsAgo(40), classroom_id: classroomIds['smart-explorers'], enrollment_status: 'active' })
    expect((await completeStudentIfReady(f.admin, id, { today, manual: true })).status).toBe('not-eligible')
    expect(await status(id)).toBe('active')
  })
})
