import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anon, Fixture, type TestUser } from './helpers'

// Teacher attendance: only an admin can record it (one row per teacher per day), a teacher can
// read only their own, and nobody else can see any of it. These are the rules in the
// teacher_attendance table's RLS policies (supabase/migrations/20260921150000_...), checked as
// real signed-in users. They need that migration to have been run.
const f = new Fixture()
let admin: TestUser
let otherAdmin: TestUser
let teacherA: TestUser
let teacherB: TestUser
let parent: TestUser
const DAY = '2031-05-20'

const rowsFor = async (teacherId: string) =>
  (await f.admin.from('teacher_attendance').select('*').eq('teacher_id', teacherId).eq('date', DAY)).data ?? []

beforeAll(async () => {
  admin = await f.user('admin', 'tattend')
  otherAdmin = await f.user('admin', 'tattendother')
  teacherA = await f.user('teacher', 'tattenda')
  teacherB = await f.user('teacher', 'tattendb')
  parent = await f.user('parent', 'tattend')
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('recording teacher attendance', () => {
  it('an admin can record a teacher present, and re-marking the same day updates the row', async () => {
    const first = await admin.client
      .from('teacher_attendance')
      .upsert({ teacher_id: teacherA.id, date: DAY, status: 'present', recorded_by: admin.id }, { onConflict: 'teacher_id,date' })
    expect(first.error).toBeNull()
    const second = await admin.client
      .from('teacher_attendance')
      .upsert({ teacher_id: teacherA.id, date: DAY, status: 'late', recorded_by: admin.id }, { onConflict: 'teacher_id,date' })
    expect(second.error).toBeNull()
    const rows = await rowsFor(teacherA.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'late', recorded_by: admin.id })
  })

  it('the database allows only one row per teacher per day', async () => {
    const { error } = await f.admin.from('teacher_attendance').insert({ teacher_id: teacherA.id, date: DAY, status: 'absent' })
    expect(error?.code).toBe('23505')
  })

  it("an admin can't record it in another admin's name", async () => {
    const { error } = await admin.client
      .from('teacher_attendance')
      .insert({ teacher_id: teacherB.id, date: DAY, status: 'present', recorded_by: otherAdmin.id })
    expect(error).not.toBeNull()
    expect(await rowsFor(teacherB.id)).toHaveLength(0)
  })
})

describe('who can see or change it', () => {
  it('a teacher cannot record attendance for themselves or anyone else', async () => {
    const own = await teacherB.client.from('teacher_attendance').insert({ teacher_id: teacherB.id, date: DAY, status: 'present' })
    expect(own.error).not.toBeNull()
    await teacherA.client.from('teacher_attendance').update({ status: 'present' }).eq('teacher_id', teacherA.id)
    await teacherA.client.from('teacher_attendance').delete().eq('teacher_id', teacherA.id)
    const rows = await rowsFor(teacherA.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('late')
  })

  it('a teacher can read their own record and no one else\'s', async () => {
    await f.admin.from('teacher_attendance').upsert({ teacher_id: teacherB.id, date: DAY, status: 'absent' }, { onConflict: 'teacher_id,date' })
    const mine = await teacherA.client.from('teacher_attendance').select('teacher_id, status')
    expect(mine.data).toEqual([{ teacher_id: teacherA.id, status: 'late' }])
    const theirs = await teacherB.client.from('teacher_attendance').select('teacher_id')
    expect(theirs.data).toEqual([{ teacher_id: teacherB.id }])
  })

  it('a parent and a visitor see nothing', async () => {
    const asParent = await parent.client.from('teacher_attendance').select('id')
    expect(asParent.data ?? []).toHaveLength(0)
    const asVisitor = await anon().from('teacher_attendance').select('id')
    expect(asVisitor.data ?? []).toHaveLength(0)
  })

  it('an admin sees every teacher', async () => {
    const { data } = await admin.client.from('teacher_attendance').select('teacher_id').eq('date', DAY)
    expect((data ?? []).map((r) => r.teacher_id).sort()).toEqual([teacherA.id, teacherB.id].sort())
  })
})
