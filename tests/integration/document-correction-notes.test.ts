import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// The per-document note an admin writes when marking a document "needs correction": the
// admin sets and clears it, the note is length-checked by the database, and a parent can
// neither write nor edit it (the application_documents lock trigger). Needs
// supabase/migrations/20260921140000_document_correction_note.sql to have been run.
const f = new Fixture()
let admin: TestUser
let parent: TestUser
let applicationId: string

const stored = async () =>
  (await f.admin.from('application_documents').select('*').eq('application_id', applicationId).eq('document_type', 'id_photo').single()).data!

beforeAll(async () => {
  admin = await f.user('admin', 'docnotes')
  parent = await f.user('parent', 'docnotes')
  const { data, error } = await f.admin
    .from('applications')
    .insert({
      student_first_name: 'Test', student_last_name: 'Child', student_dob: '2023-01-01', student_gender: 'female',
      parent_first_name: 'Test', parent_last_name: 'Parent', parent_dob: '1990-01-01', parent_relationship: 'Mother',
      parent_gender: 'female', parent_contact_number: '09171234567', parent_email: parent.email, created_parent_id: parent.id, status: 'approved',
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message)
  applicationId = data.id
  const { error: docError } = await f.admin
    .from('application_documents')
    .insert({ application_id: applicationId, document_type: 'id_photo', file_url: 'zz-test.jpg', verification_status: 'pending' })
  if (docError) throw new Error(docError.message)
}, 120_000)

afterAll(async () => {
  await f.admin.from('application_documents').delete().eq('application_id', applicationId)
  await f.admin.from('applications').delete().like('parent_email', 'zz-test-%@example.test')
  await f.cleanup()
})

const review = (patch: Record<string, unknown>) =>
  admin.client.from('application_documents').update(patch).eq('application_id', applicationId).eq('document_type', 'id_photo')

describe('the correction note on a document', () => {
  it('an admin can mark a document needing correction and say what is wrong', async () => {
    const { error } = await review({ verification_status: 'needs_correction', correction_note: 'The photo is blurry.' })
    expect(error).toBeNull()
    expect(await stored()).toMatchObject({ verification_status: 'needs_correction', correction_note: 'The photo is blurry.' })
  })

  it('the parent can read it', async () => {
    const { data } = await parent.client.from('application_documents').select('correction_note').eq('application_id', applicationId)
    expect(data).toEqual([{ correction_note: 'The photo is blurry.' }])
  })

  it('the parent cannot change or clear it, even while re-uploading', async () => {
    await parent.client.from('application_documents').update({ correction_note: 'all good, honest' }).eq('application_id', applicationId)
    expect((await stored()).correction_note).toBe('The photo is blurry.')
    await parent.client
      .from('application_documents')
      .update({ file_url: 'zz-test-2.jpg', verification_status: 'pending', correction_note: null })
      .eq('application_id', applicationId)
    expect((await stored()).correction_note).toBe('The photo is blurry.')
  })

  it('a re-upload (file and pending status only) leaves the note alone, and the admin can clear it', async () => {
    const { error } = await parent.client
      .from('application_documents')
      .update({ file_url: 'zz-test-3.jpg', verification_status: 'pending' })
      .eq('application_id', applicationId)
    expect(error).toBeNull()
    expect(await stored()).toMatchObject({ file_url: 'zz-test-3.jpg', verification_status: 'pending', correction_note: 'The photo is blurry.' })

    const cleared = await review({ verification_status: 'valid', correction_note: null })
    expect(cleared.error).toBeNull()
    expect((await stored()).correction_note).toBeNull()
  })

  it('the database refuses a blank note or one over 500 characters', async () => {
    expect((await review({ correction_note: '   ' })).error).not.toBeNull()
    expect((await review({ correction_note: 'x'.repeat(501) })).error).not.toBeNull()
    expect((await review({ correction_note: 'x'.repeat(500) })).error).toBeNull()
  })
})
