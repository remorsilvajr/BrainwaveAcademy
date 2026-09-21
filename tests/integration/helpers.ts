import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const TEST_EMAIL_DOMAIN = 'example.test'
export const TEST_EMAIL_PREFIX = 'zz-test-'

export type Role = 'admin' | 'teacher' | 'parent' | 'cashier'
export type TestUser = { id: string; email: string; password: string; role: Role; client: SupabaseClient }

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
}

/** A client with no login, exactly what a visitor to the public site has. */
export const anon = anonClient

/** Everything a test creates, so afterAll can remove it even if the test failed. */
export class Fixture {
  readonly admin = adminClient()
  readonly users: TestUser[] = []
  readonly studentIds: string[] = []

  async user(role: Role, label: string = role): Promise<TestUser> {
    const email = `${TEST_EMAIL_PREFIX}${label}-${randomUUID().slice(0, 8)}@${TEST_EMAIL_DOMAIN}`
    const password = `Pw-${randomUUID()}`
    const { data, error } = await this.admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
    const id = data.user.id
    // is_verified/account_status are the defaults; role is set here because the profile
    // is created by the service role, which is exactly how the app's own actions do it.
    const { error: profileError } = await this.admin.from('profiles').insert({ id, role, first_name: 'Test', last_name: label.replace(/[^a-z]/gi, '') || 'User', email })
    if (profileError) throw new Error(`profile insert failed: ${profileError.message}`)
    const client = anonClient()
    const { error: signInError } = await client.auth.signInWithPassword({ email, password })
    if (signInError) throw new Error(`sign in failed: ${signInError.message}`)
    const user = { id, email, password, role, client }
    this.users.push(user)
    return user
  }

  /** A student, optionally linked to a parent. */
  async student(parent?: TestUser, extra: Record<string, unknown> = {}): Promise<string> {
    const { data, error } = await this.admin
      .from('students')
      .insert({ first_name: 'Test', last_name: 'Child', date_of_birth: '2022-01-01', gender: 'male', ...extra })
      .select('id')
      .single()
    if (error || !data) throw new Error(`student insert failed: ${error?.message}`)
    this.studentIds.push(data.id)
    if (parent) {
      const { error: linkError } = await this.admin.from('parent_student').insert({ parent_id: parent.id, student_id: data.id, relationship: 'Mother' })
      if (linkError) throw new Error(`parent_student insert failed: ${linkError.message}`)
    }
    return data.id
  }

  async cleanup() {
    await cleanupTestData(this.admin, this.users.map((u) => u.id), this.studentIds)
  }
}

const bestEffort = async (run: PromiseLike<unknown>) => {
  try {
    await run
  } catch {
    // a leftover is caught by the sweep script
  }
}

/** Removes the given test users and students and every row that hangs off them. */
export async function cleanupTestData(admin: SupabaseClient, userIds: string[], studentIds: string[]) {
  if (studentIds.length > 0) {
    for (const table of ['student_health', 'emergency_contacts', 'do_not_release', 'attendance', 'milestones', 'authorized_pickups', 'payment_adjustments', 'unenrollment_requests', 'student_promotions', 'parent_student']) {
      await bestEffort(admin.from(table).delete().in('student_id', studentIds))
    }
    await bestEffort(admin.from('payments').delete().in('student_id', studentIds))
    await bestEffort(admin.from('students').delete().in('id', studentIds))
  }
  if (userIds.length > 0) {
    await bestEffort(admin.from('parent_student').delete().in('parent_id', userIds))
    for (const [table, column] of [
      ['notifications', 'user_id'],
      ['wallet_transactions', 'parent_id'],
      ['wallet_requests', 'parent_id'],
      ['wallets', 'parent_id'],
      ['feedback', 'submitted_by'],
      ['event_rsvps', 'parent_id'],
      // Photos hang off the uploading teacher (they have no student), and a test
      // teacher may have been made an assistant of a real classroom.
      ['album_photos', 'uploaded_by'],
      ['classroom_assistants', 'teacher_id'],
    ] as const) {
      await bestEffort(admin.from(table).delete().in(column, userIds))
    }
    await bestEffort(admin.from('activity_log').delete().in('actor_id', userIds))
    await bestEffort(admin.from('profiles').delete().in('id', userIds))
    for (const id of userIds) await bestEffort(admin.auth.admin.deleteUser(id))
  }
}
