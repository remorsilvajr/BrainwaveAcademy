import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// "Request Correction" on an enrollment request: the admin sets needs_correction, and only
// the request's own parent may fix the details and send it back to pending_review, changing
// nothing else. These are the rules in the parents_resubmit_own_application policy and the
// enforce_applications_parent_lock trigger (supabase/migrations/20260921130000_...), checked
// as real signed-in users. They need that migration to have been run.
const f = new Fixture()
let admin: TestUser
let parent: TestUser
let stranger: TestUser
let applicationId: string

const application = () => ({
  student_first_name: 'Test',
  student_last_name: 'Child',
  student_dob: '2023-01-01',
  student_gender: 'female',
  parent_first_name: 'Test',
  parent_last_name: 'Parent',
  parent_dob: '1990-01-01',
  parent_relationship: 'Mother',
  parent_gender: 'female',
  parent_contact_number: '09171234567',
  parent_email: parent.email,
  created_parent_id: parent.id,
})

const stored = async () => (await f.admin.from('applications').select('*').eq('id', applicationId).single()).data!

beforeAll(async () => {
  admin = await f.user('admin', 'correction')
  parent = await f.user('parent', 'correction')
  stranger = await f.user('parent', 'correctionother')
  const { data, error } = await f.admin.from('applications').insert(application()).select('id').single()
  if (error || !data) throw new Error(error?.message)
  applicationId = data.id
}, 120_000)

afterAll(async () => {
  await f.admin.from('applications').delete().like('parent_email', 'zz-test-%@example.test')
  await f.cleanup()
})

describe('requesting a correction', () => {
  it('an admin can move a pending request to needs_correction with a note', async () => {
    const { error } = await admin.client
      .from('applications')
      .update({ status: 'needs_correction', review_notes: 'Please check the date of birth.', reviewed_at: new Date().toISOString() })
      .eq('id', applicationId)
    expect(error).toBeNull()
    const row = await stored()
    expect(row.status).toBe('needs_correction')
    expect(row.review_notes).toBe('Please check the date of birth.')
  })
})

describe('resubmitting', () => {
  it("another family can't touch the request", async () => {
    await stranger.client.from('applications').update({ status: 'pending_review', student_first_name: 'Hacked' }).eq('id', applicationId)
    const row = await stored()
    expect(row.status).toBe('needs_correction')
    expect(row.student_first_name).toBe('Test')
  })

  it('the parent cannot approve it, or change anything but the correctable details', async () => {
    await parent.client.from('applications').update({ status: 'approved' }).eq('id', applicationId)
    expect((await stored()).status).toBe('needs_correction')

    // pending_review is allowed only together with correctable columns: these are not
    for (const change of [{ review_notes: 'edited by parent' }, { created_parent_id: stranger.id }, { archived: true }, { created_student_id: null, reviewed_by: parent.id }]) {
      await parent.client.from('applications').update({ status: 'pending_review', ...change }).eq('id', applicationId)
      const row = await stored()
      expect(row.status, JSON.stringify(change)).toBe('needs_correction')
      expect(row.review_notes).toBe('Please check the date of birth.')
      expect(row.created_parent_id).toBe(parent.id)
      expect(row.archived).toBe(false)
    }
  })

  it('the parent can correct the details and send it back to pending review', async () => {
    const { data, error } = await parent.client
      .from('applications')
      .update({ status: 'pending_review', student_first_name: 'Corrected', student_dob: '2023-02-02', parent_contact_number: '09179998888' })
      .eq('id', applicationId)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    const row = await stored()
    expect(row).toMatchObject({ status: 'pending_review', student_first_name: 'Corrected', student_dob: '2023-02-02', created_parent_id: parent.id })
    // the school's note and review stamp stay exactly as they were
    expect(row.review_notes).toBe('Please check the date of birth.')
  })

  it('once resubmitted the parent can no longer edit it', async () => {
    await parent.client.from('applications').update({ student_first_name: 'Again' }).eq('id', applicationId)
    expect((await stored()).student_first_name).toBe('Corrected')
  })

  it('a request that was never sent back for correction cannot be edited by the parent', async () => {
    // Approved by a signed-in admin, as in the app (the lock trigger refuses a service-role write).
    const approved = await admin.client.from('applications').update({ status: 'approved' }).eq('id', applicationId)
    expect(approved.error).toBeNull()
    expect((await stored()).status).toBe('approved')
    await parent.client.from('applications').update({ status: 'pending_review', student_first_name: 'Sneaky' }).eq('id', applicationId)
    const row = await stored()
    expect(row.status).toBe('approved')
    expect(row.student_first_name).toBe('Corrected')
  })
})

// An older request (submitted before parents got an account at sign-up) has no
// created_parent_id. requestApplicationCorrection links it to the parent account
// with the same email in the same update, so that parent can then resubmit it.
describe('an older request with no linked account', () => {
  let olderId: string
  const storedOlder = async () => (await f.admin.from('applications').select('*').eq('id', olderId).single()).data!

  beforeAll(async () => {
    const { data, error } = await f.admin.from('applications').insert({ ...application(), created_parent_id: null }).select('id').single()
    if (error || !data) throw new Error(error?.message)
    olderId = data.id
  })

  it('the parent cannot resubmit it while it is unlinked', async () => {
    const r = await admin.client.from('applications').update({ status: 'needs_correction', review_notes: 'Fix the name.' }).eq('id', olderId)
    expect(r.error).toBeNull()
    const { data } = await parent.client.from('applications').update({ status: 'pending_review', student_first_name: 'Fixed' }).eq('id', olderId).select('id')
    expect(data ?? []).toHaveLength(0)
    expect((await storedOlder()).status).toBe('needs_correction')
    // back to pending for the next case, as a signed-in admin
    expect((await admin.client.from('applications').update({ status: 'pending_review' }).eq('id', olderId)).error).toBeNull()
  })

  it('an admin can link it while requesting a correction, and the parent can then resubmit', async () => {
    const r = await admin.client
      .from('applications')
      .update({ status: 'needs_correction', created_parent_id: parent.id, review_notes: 'Fix the name.', reviewed_at: new Date().toISOString() })
      .eq('id', olderId)
      .select('id')
    expect(r.error).toBeNull()
    expect(r.data).toHaveLength(1)
    expect((await storedOlder()).created_parent_id).toBe(parent.id)

    const { data, error } = await parent.client.from('applications').update({ status: 'pending_review', student_first_name: 'Fixed' }).eq('id', olderId).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(await storedOlder()).toMatchObject({ status: 'pending_review', student_first_name: 'Fixed' })
  })
})
