import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { afterAll, describe, expect, it } from 'vitest'
import { createParentWithApplication, type ParentProfileInput } from '@/lib/parent-signup'
import { adminClient, cleanupTestData, TEST_EMAIL_DOMAIN, TEST_EMAIL_PREFIX } from './helpers'

// The public enroll form now creates the parent's account with the password they
// typed. Runs the real account-creation logic against the live project with
// throwaway zz-test-*@example.test addresses.
const admin = adminClient()
const createdUserIds: string[] = []

const email = (label: string) => `${TEST_EMAIL_PREFIX}${label}-${randomUUID().slice(0, 8)}@${TEST_EMAIL_DOMAIN}`

const profile: ParentProfileInput = {
  first_name: 'Test',
  middle_name: null,
  last_name: 'Signup',
  phone_number: '09171234567',
  date_of_birth: '1990-01-01',
  relationship_to_student: 'Mother',
  gender: 'female',
}

const application = (extra: Record<string, unknown> = {}) => ({
  student_first_name: 'Test',
  student_last_name: 'Child',
  student_dob: '2023-01-01',
  student_gender: 'female',
  parent_first_name: profile.first_name,
  parent_last_name: profile.last_name,
  parent_dob: profile.date_of_birth,
  parent_relationship: profile.relationship_to_student,
  parent_gender: 'female',
  parent_contact_number: profile.phone_number,
  ...extra,
})

const strongPassword = () => `Zq-${randomUUID()}-9!`

afterAll(async () => {
  await admin.from('applications').delete().like('parent_email', `${TEST_EMAIL_PREFIX}%@${TEST_EMAIL_DOMAIN}`)
  await cleanupTestData(admin, createdUserIds, [])
})

describe('createParentWithApplication', () => {
  it('creates the account, wallet and a linked request, and the parent can sign in with their password', async () => {
    const address = email('ok')
    const password = strongPassword()
    const result = await createParentWithApplication(admin, { email: address, password, profile, application: application() })
    if (!result.ok) throw new Error(result.error)
    createdUserIds.push(result.userId)

    const { data: storedProfile } = await admin.from('profiles').select('*').eq('id', result.userId).single()
    expect(storedProfile).toMatchObject({ role: 'parent', email: address, account_status: 'active' })

    const { data: wallet } = await admin.from('wallets').select('parent_id').eq('parent_id', result.userId)
    expect(wallet).toHaveLength(1)

    const { data: request } = await admin.from('applications').select('*').eq('id', result.applicationId).single()
    expect(request).toMatchObject({ created_parent_id: result.userId, parent_email: address, status: 'pending_review' })

    // The typed password works, and it was not stored anywhere readable.
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    const { error } = await client.auth.signInWithPassword({ email: address, password })
    expect(error).toBeNull()
    expect(JSON.stringify(storedProfile)).not.toContain(password)
    expect(JSON.stringify(request)).not.toContain(password)
  })

  it('refuses an email that already has an account', async () => {
    const address = email('taken')
    const first = await createParentWithApplication(admin, { email: address, password: strongPassword(), profile, application: application() })
    if (!first.ok) throw new Error(first.error)
    createdUserIds.push(first.userId)

    const second = await createParentWithApplication(admin, { email: address, password: strongPassword(), profile, application: application() })
    expect(second).toMatchObject({ ok: false, field: 'email' })
    const { data } = await admin.from('profiles').select('id').eq('email', address)
    expect(data).toHaveLength(1)
  })

  it("refuses an email that is on an older request nobody has an account for, so a new account can't read it", async () => {
    const address = email('unclaimed')
    const { error } = await admin.from('applications').insert(application({ parent_email: address }))
    expect(error).toBeNull()

    const result = await createParentWithApplication(admin, { email: address, password: strongPassword(), profile, application: application() })
    expect(result).toMatchObject({ ok: false, field: 'email' })
    const { data: profiles } = await admin.from('profiles').select('id').eq('email', address)
    expect(profiles ?? []).toHaveLength(0)
  })

  it('leaves nothing behind when the request cannot be saved', async () => {
    const address = email('rollback')
    // A classroom id that does not exist makes the application insert fail after the account exists.
    const result = await createParentWithApplication(admin, {
      email: address,
      password: strongPassword(),
      profile,
      application: application({ requested_classroom_id: randomUUID() }),
    })
    expect(result.ok).toBe(false)

    const { data: profiles } = await admin.from('profiles').select('id').eq('email', address)
    expect(profiles ?? []).toHaveLength(0)
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
    expect(users.users.some((u) => u.email === address)).toBe(false)
    const { data: requests } = await admin.from('applications').select('id').eq('parent_email', address)
    expect(requests ?? []).toHaveLength(0)
  })
})
