import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'
import { todayIso } from '@/lib/format'

// Attendance writes are limited to a teacher's own classes, and arrival/departure
// times are stored with departure never before arrival. Needs
// 20261009140000_attendance_arrival_departure.sql.
const f = new Fixture()
let teacher: TestUser
let ownStudent: string
let otherStudent: string
const today = todayIso()

beforeAll(async () => {
  teacher = await f.user('teacher', 'attscope')
  const { data: classes } = await f.admin.from('classrooms').select('id, slug').in('slug', ['little-explorers', 'smart-explorers'])
  const own = classes!.find((c) => c.slug === 'little-explorers')!.id
  const other = classes!.find((c) => c.slug === 'smart-explorers')!.id
  const { error } = await f.admin.from('classroom_assistants').insert({ classroom_id: own, teacher_id: teacher.id })
  if (error) throw new Error(error.message)
  ownStudent = await f.student(undefined, { classroom_id: own, enrollment_status: 'active' })
  otherStudent = await f.student(undefined, { classroom_id: other, enrollment_status: 'active' })
}, 60_000)

afterAll(async () => {
  await f.admin.from('attendance').delete().in('student_id', [ownStudent, otherStudent])
  await f.cleanup()
})

describe('a teacher takes attendance only for their own class', () => {
  it('can mark their own class, with an arrival time', async () => {
    const { error } = await teacher.client
      .from('attendance')
      .insert({ student_id: ownStudent, date: today, status: 'present', recorded_by: teacher.id, arrival_time: '07:45' })
    expect(error).toBeNull()
  })

  it('can add a departure time, but not one before arrival', async () => {
    const ok = await teacher.client.from('attendance').update({ departure_time: '14:30', recorded_by: teacher.id }).eq('student_id', ownStudent).eq('date', today).select('id')
    expect(ok.error).toBeNull()
    expect(ok.data).toHaveLength(1)
    const bad = await teacher.client.from('attendance').update({ departure_time: '06:00', recorded_by: teacher.id }).eq('student_id', ownStudent).eq('date', today)
    expect(bad.error?.message).toMatch(/attendance_departure_after_arrival/)
  })

  it('cannot mark a child in another class', async () => {
    const { error } = await teacher.client.from('attendance').insert({ student_id: otherStudent, date: today, status: 'present', recorded_by: teacher.id })
    expect(error).not.toBeNull()
  })

  it("cannot change another class's record, but can still read it", async () => {
    expect((await f.admin.from('attendance').insert({ student_id: otherStudent, date: today, status: 'absent' })).error).toBeNull()
    const { data } = await teacher.client.from('attendance').update({ status: 'present' }).eq('student_id', otherStudent).select('id')
    expect(data ?? []).toHaveLength(0)
    const read = await teacher.client.from('attendance').select('status').eq('student_id', otherStudent).single()
    expect(read.data?.status).toBe('absent')
  })

  it('cannot delete attendance', async () => {
    await teacher.client.from('attendance').delete().eq('student_id', ownStudent)
    const { data } = await f.admin.from('attendance').select('id').eq('student_id', ownStudent)
    expect(data).toHaveLength(1)
  })
})
