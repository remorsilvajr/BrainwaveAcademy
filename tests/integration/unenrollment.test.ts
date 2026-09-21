import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// The rules under the unenrollment flow, checked in the database: who can file a
// request, that only one can be pending per child, and that a parent can do
// nothing to a request except cancel it while it is still pending. (The admin's
// approve/decline actions themselves run behind Next's request scope and are not
// called here; this covers the policies and triggers they rely on.)
const f = new Fixture()
let admin: TestUser
let parentA: TestUser
let parentB: TestUser
let childOfA: string
let childOfB: string

const request = (student_id: string, extra: Record<string, unknown> = {}) => ({
  student_id,
  requested_by: parentA.id,
  reason: 'We are moving to another city.',
  last_day: '2031-03-31',
  ...extra,
})

const fileRequest = async () => {
  const { data, error } = await parentA.client.from('unenrollment_requests').insert(request(childOfA)).select('id').single()
  if (error || !data) throw new Error(error?.message)
  return data.id as string
}
const stored = async (id: string) => {
  const { data } = await f.admin.from('unenrollment_requests').select('*').eq('id', id).single()
  return data
}
const clear = () => f.admin.from('unenrollment_requests').delete().in('student_id', [childOfA, childOfB])

beforeAll(async () => {
  admin = await f.user('admin')
  parentA = await f.user('parent', 'unenrolla')
  parentB = await f.user('parent', 'unenrollb')
  childOfA = await f.student(parentA)
  childOfB = await f.student(parentB)
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('filing a request', () => {
  it('a parent can file one for their own child', async () => {
    const { error } = await parentA.client.from('unenrollment_requests').insert(request(childOfA))
    expect(error).toBeNull()
    const { data } = await f.admin.from('unenrollment_requests').select('status').eq('student_id', childOfA)
    expect(data).toEqual([{ status: 'pending' }])
    await clear()
  })

  it("a parent cannot file one for another family's child", async () => {
    const { error } = await parentA.client.from('unenrollment_requests').insert(request(childOfB))
    expect(error).not.toBeNull()
  })

  it('a parent cannot file one in another parent\'s name', async () => {
    const { error } = await parentA.client.from('unenrollment_requests').insert(request(childOfA, { requested_by: parentB.id }))
    expect(error).not.toBeNull()
  })

  it('a request cannot arrive already approved or already reviewed', async () => {
    const approved = await parentA.client.from('unenrollment_requests').insert(request(childOfA, { status: 'approved' }))
    expect(approved.error).not.toBeNull()
    const reviewed = await parentA.client.from('unenrollment_requests').insert(request(childOfA, { fee_decision: 'waive', reviewed_by: admin.id }))
    expect(reviewed.error).not.toBeNull()
    const { data } = await f.admin.from('unenrollment_requests').select('id').eq('student_id', childOfA)
    expect(data ?? []).toHaveLength(0)
  })

  it('a reason that is too short is refused', async () => {
    const { error } = await parentA.client.from('unenrollment_requests').insert(request(childOfA, { reason: 'no' }))
    expect(error).not.toBeNull()
  })

  it('only one request can be pending per child', async () => {
    await parentA.client.from('unenrollment_requests').insert(request(childOfA))
    const again = await parentA.client.from('unenrollment_requests').insert(request(childOfA))
    expect(again.error?.code).toBe('23505')
    await clear()
  })

  it('a new one can be filed once the last was handled', async () => {
    const id = await fileRequest()
    const decided = await admin.client.from('unenrollment_requests').update({ status: 'declined', review_note: 'Please talk to the office.' }).eq('id', id)
    expect(decided.error).toBeNull()
    const { error } = await parentA.client.from('unenrollment_requests').insert(request(childOfA))
    expect(error).toBeNull()
    await clear()
  })
})

describe('what a parent can do to a request', () => {
  it('can cancel their own pending request', async () => {
    const id = await fileRequest()
    const { error } = await parentA.client.from('unenrollment_requests').update({ status: 'cancelled' }).eq('id', id)
    expect(error).toBeNull()
    expect((await stored(id))?.status).toBe('cancelled')
    await clear()
  })

  it('cannot approve it themselves', async () => {
    const id = await fileRequest()
    await parentA.client.from('unenrollment_requests').update({ status: 'approved', fee_decision: 'waive' }).eq('id', id)
    const row = await stored(id)
    expect(row?.status).toBe('pending')
    expect(row?.fee_decision).toBeNull()
    await clear()
  })

  it('cannot rewrite the reason or last day while cancelling', async () => {
    const id = await fileRequest()
    await parentA.client.from('unenrollment_requests').update({ status: 'cancelled', reason: 'Changed my story.', last_day: '2031-12-01' }).eq('id', id)
    const row = await stored(id)
    expect(row?.reason).toBe('We are moving to another city.')
    expect(row?.last_day).toBe('2031-03-31')
    await clear()
  })

  it('cannot cancel a request that was already decided', async () => {
    const id = await fileRequest()
    const decided = await admin.client.from('unenrollment_requests').update({ status: 'approved', reviewed_by: admin.id }).eq('id', id)
    expect(decided.error).toBeNull()
    await parentA.client.from('unenrollment_requests').update({ status: 'cancelled' }).eq('id', id)
    expect((await stored(id))?.status).toBe('approved')
    await clear()
  })

  it("cannot read or cancel another family's request", async () => {
    const id = await fileRequest()
    const { data } = await parentB.client.from('unenrollment_requests').select('id').eq('id', id)
    expect(data ?? []).toHaveLength(0)
    await parentB.client.from('unenrollment_requests').update({ status: 'cancelled' }).eq('id', id)
    expect((await stored(id))?.status).toBe('pending')
    await clear()
  })

  it('cannot delete a request', async () => {
    const id = await fileRequest()
    await parentA.client.from('unenrollment_requests').delete().eq('id', id)
    expect(await stored(id)).not.toBeNull()
    await clear()
  })
})

describe('what an admin can do', () => {
  it('can read every request and record a decision', async () => {
    const id = await fileRequest()
    const seen = await admin.client.from('unenrollment_requests').select('id').eq('id', id)
    expect(seen.data).toHaveLength(1)
    const { error } = await admin.client
      .from('unenrollment_requests')
      .update({ status: 'declined', review_note: 'Please talk to the office.', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    expect(error).toBeNull()
    expect((await stored(id))?.status).toBe('declined')
    await clear()
  })
})
