import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// Pickup history RLS: staff record (as themselves) and read everything; a parent
// reads only their own children's; nobody rewrites history. Needs
// 20261009150000_pickup_records.sql.
const f = new Fixture()
let teacher: TestUser
let parent: TestUser
let otherParent: TestUser
let studentId: string

const row = (by: TestUser, extra: Record<string, unknown> = {}) => ({
  student_id: studentId,
  student_name: 'Test Child',
  person_name: 'Tita Test',
  relationship: 'Aunt',
  method: 'name',
  recorded_by: by.id,
  recorded_by_name: 'Test Teacher',
  ...extra,
})

beforeAll(async () => {
  teacher = await f.user('teacher', 'pickuphist')
  parent = await f.user('parent', 'pickuphist')
  otherParent = await f.user('parent', 'pickuphistother')
  studentId = await f.student(parent, { enrollment_status: 'active' })
}, 60_000)

afterAll(async () => {
  await f.admin.from('pickup_records').delete().eq('student_id', studentId)
  await f.cleanup()
})

describe('pickup history', () => {
  it('a teacher records a pickup as themselves, timed now', async () => {
    const { data, error } = await teacher.client.from('pickup_records').insert(row(teacher)).select('picked_up_at').single()
    expect(error).toBeNull()
    expect(Math.abs(new Date(data!.picked_up_at).getTime() - Date.now())).toBeLessThan(120_000)
  })

  it('cannot record as someone else, or backdate it, and a parent cannot record at all', async () => {
    expect((await teacher.client.from('pickup_records').insert(row(parent))).error).not.toBeNull()
    expect((await teacher.client.from('pickup_records').insert(row(teacher, { picked_up_at: '2026-01-01T08:00:00Z' }))).error).not.toBeNull()
    expect((await parent.client.from('pickup_records').insert(row(parent))).error).not.toBeNull()
  })

  it('the parent sees their child\'s history, another family does not', async () => {
    expect((await parent.client.from('pickup_records').select('id').eq('student_id', studentId)).data).toHaveLength(1)
    expect((await otherParent.client.from('pickup_records').select('id').eq('student_id', studentId)).data ?? []).toHaveLength(0)
  })

  it('nobody but the service role can change or delete it', async () => {
    await teacher.client.from('pickup_records').update({ person_name: 'Changed' }).eq('student_id', studentId)
    await teacher.client.from('pickup_records').delete().eq('student_id', studentId)
    const { data } = await f.admin.from('pickup_records').select('person_name').eq('student_id', studentId)
    expect(data).toEqual([{ person_name: 'Tita Test' }])
  })
})
