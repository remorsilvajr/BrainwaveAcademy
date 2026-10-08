import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Fixture, type TestUser } from './helpers'

// Class-photo consent: a parent may set photo_consent on their own child (and
// still nothing else besides the avatar), never on someone else's child, and a
// teacher can't change it. These are students' RLS + enforce_students_parent_lock
// as changed by supabase/migrations/20261008120000_photo_consent.sql, which must
// have been run first.
const f = new Fixture()
let parent: TestUser
let otherParent: TestUser
let teacher: TestUser
let child: string
let otherChild: string

const consentOf = async (id: string) =>
  (await f.admin.from('students').select('photo_consent, first_name').eq('id', id).single()).data

beforeAll(async () => {
  parent = await f.user('parent', 'consent')
  otherParent = await f.user('parent', 'consentother')
  teacher = await f.user('teacher', 'consent')
  child = await f.student(parent)
  otherChild = await f.student(otherParent)
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('photo consent', () => {
  it('starts unanswered', async () => {
    expect((await consentOf(child))?.photo_consent).toBeNull()
  })

  it('a parent can allow and then withdraw it for their own child', async () => {
    const yes = await parent.client.from('students').update({ photo_consent: true, photo_consent_updated_at: new Date().toISOString() }).eq('id', child).select('id')
    expect(yes.error).toBeNull()
    expect(yes.data).toHaveLength(1)
    expect((await consentOf(child))?.photo_consent).toBe(true)
    const no = await parent.client.from('students').update({ photo_consent: false }).eq('id', child).select('id')
    expect(no.error).toBeNull()
    expect((await consentOf(child))?.photo_consent).toBe(false)
  })

  it("a parent can't set it on another family's child", async () => {
    const res = await parent.client.from('students').update({ photo_consent: true }).eq('id', otherChild).select('id')
    expect(res.data ?? []).toHaveLength(0)
    expect((await consentOf(otherChild))?.photo_consent).toBeNull()
  })

  it('a parent still cannot change any other column alongside it', async () => {
    const res = await parent.client.from('students').update({ photo_consent: true, first_name: 'Hacked' }).eq('id', child)
    expect(res.error).not.toBeNull()
    expect((await consentOf(child))?.first_name).toBe('Test')
  })

  it("a teacher can't change it", async () => {
    const res = await teacher.client.from('students').update({ photo_consent: true }).eq('id', otherChild).select('id')
    expect(res.data ?? []).toHaveLength(0)
    expect((await consentOf(otherChild))?.photo_consent).toBeNull()
  })
})
