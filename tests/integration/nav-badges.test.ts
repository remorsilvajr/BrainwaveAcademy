import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadStateBadges, sectionSeenFilter } from '@/lib/nav-badges'
import { Fixture, type TestUser } from './helpers'

// The sidebar numbers, against the real project as signed-in throwaway users: a
// parent's Requirements count follows uploads and corrections, opening a tab clears
// only that tab's notifications, and an admin's counts are real numbers.
const f = new Fixture()
let parent: TestUser
let admin: TestUser
let applicationId: string
const TABS = ['/parent/requirements']

const application = (extra: Record<string, unknown> = {}) => ({
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
  status: 'approved',
  ...extra,
})

const requirementsBadge = async () => (await loadStateBadges(parent.client, 'parent', parent.id, TABS))['/parent/requirements']
// A parent's upload is always "pending"; only a signed-in admin (the trigger checks
// auth_role) can mark a document valid or needing correction, as in the real app.
const setDoc = async (document_type: string, verification_status: string, file_url: string | null = 'zz-test.pdf') => {
  const { error } = await f.admin
    .from('application_documents')
    .upsert({ application_id: applicationId, document_type, file_url, verification_status: 'pending' }, { onConflict: 'application_id,document_type' })
  expect(error).toBeNull()
  if (verification_status !== 'pending') {
    const reviewed = await admin.client
      .from('application_documents')
      .update({ verification_status })
      .eq('application_id', applicationId)
      .eq('document_type', document_type)
    expect(reviewed.error).toBeNull()
  }
}

beforeAll(async () => {
  parent = await f.user('parent', 'badges')
  admin = await f.user('admin', 'badges')
  const { data, error } = await f.admin.from('applications').insert(application()).select('id').single()
  if (error || !data) throw new Error(error?.message)
  applicationId = data.id
}, 120_000)

afterAll(async () => {
  await f.admin.from('application_documents').delete().eq('application_id', applicationId)
  await f.admin.from('applications').delete().like('parent_email', 'zz-test-%@example.test')
  await f.cleanup()
})

describe("a parent's Requirements number", () => {
  it('starts at the four required documents', async () => {
    expect(await requirementsBadge()).toBe(4)
  })

  it('goes down by one for each file uploaded', async () => {
    await setDoc('birth_certificate', 'pending')
    expect(await requirementsBadge()).toBe(3)
    await setDoc('id_photo', 'pending')
    expect(await requirementsBadge()).toBe(2)
  })

  it('goes up by one for each correction the admin requests, and down again when it is re-uploaded', async () => {
    await setDoc('birth_certificate', 'needs_correction')
    expect(await requirementsBadge()).toBe(3)
    await setDoc('id_photo', 'needs_correction')
    expect(await requirementsBadge()).toBe(4)
    await setDoc('birth_certificate', 'pending') // the parent uploads a fixed copy
    expect(await requirementsBadge()).toBe(3)
  })

  it('reaches zero when everything is uploaded and valid, and ignores a rejected request', async () => {
    for (const type of ['birth_certificate', 'id_photo', 'proof_of_address', 'guardian_valid_id']) await setDoc(type, 'valid')
    expect(await requirementsBadge()).toBe(0)
    const { data: rejected } = await f.admin.from('applications').insert(application({ status: 'rejected', student_first_name: 'Rejected' })).select('id').single()
    expect(rejected).not.toBeNull()
    expect(await requirementsBadge()).toBe(0)
  })

  it("never counts another family's request", async () => {
    const other = await f.user('parent', 'badgesother')
    const { data } = await f.admin.from('applications').insert(application({ created_parent_id: other.id, parent_email: other.email })).select('id').single()
    expect(data).not.toBeNull()
    expect((await loadStateBadges(other.client, 'parent', other.id, TABS))['/parent/requirements']).toBe(4)
    expect(await requirementsBadge()).toBe(0)
  })
})

describe('opening a tab clears what was new in it', () => {
  it('marks only that tab (and what is under it) as read', async () => {
    const rows = [
      '/parent/album/2031-06-15',
      '/parent/album',
      '/parent/album?x=1',
      '/parent/calendar?month=2031-06',
      '/parent/payments',
      '/parent/albums-not-this-one',
    ].map((href, i) => ({ user_id: parent.id, kind: 'message', title: `n${i}`, href }))
    const { error: insertError } = await f.admin.from('notifications').insert(rows)
    expect(insertError).toBeNull()

    // exactly what markSectionSeen runs, as the signed-in parent
    const { error } = await parent.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .or(sectionSeenFilter('/parent/album'))
    expect(error).toBeNull()

    const { data } = await f.admin.from('notifications').select('href, read_at').eq('user_id', parent.id)
    const read = (data ?? []).filter((n) => n.read_at).map((n) => n.href).sort()
    expect(read).toEqual(['/parent/album', '/parent/album/2031-06-15', '/parent/album?x=1'])
  })

  it("cannot clear someone else's notifications", async () => {
    const other = await f.user('parent', 'badgesthief')
    await f.admin.from('notifications').insert({ user_id: parent.id, kind: 'message', title: 'mine', href: '/parent/feedback' })
    await other.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .or(sectionSeenFilter('/parent/feedback'))
    const { data } = await f.admin.from('notifications').select('read_at').eq('user_id', parent.id).eq('href', '/parent/feedback')
    expect(data?.every((n) => n.read_at === null)).toBe(true)
  })
})

describe('an admin sees real counts, and nobody else gets them', () => {
  const ADMIN_TABS = ['/admin/enroll-a-student', '/admin/applications', '/admin/unenrollment', '/admin/feedback', '/admin/payments']

  it('returns a number for every admin tab', async () => {
    const counts = await loadStateBadges(admin.client, 'admin', admin.id, ADMIN_TABS)
    for (const tab of ADMIN_TABS) expect(typeof counts[tab]).toBe('number')
  })

  it('counts a pending enrollment request', async () => {
    const before = (await loadStateBadges(admin.client, 'admin', admin.id, ADMIN_TABS))['/admin/enroll-a-student']
    const { error } = await f.admin.from('applications').insert(application({ status: 'pending_review', student_first_name: 'Pending' }))
    expect(error).toBeNull()
    const after = (await loadStateBadges(admin.client, 'admin', admin.id, ADMIN_TABS))['/admin/enroll-a-student']
    expect(after).toBe(before + 1)
  })

  it('gives a parent no admin counts', async () => {
    expect(await loadStateBadges(parent.client, 'parent', parent.id, ADMIN_TABS)).toEqual({})
  })
})
