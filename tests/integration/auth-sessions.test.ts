import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { revokeAllSessions } from '@/lib/revoke-sessions'
import { Fixture, type TestUser } from './helpers'

// One account signed in on two devices (two browsers, or two lab PCs sharing a
// login). Signing out on one device must not sign the other one out: that is what
// `logout()` in app/login/actions.ts relies on by passing `scope: 'local'`.
// supabase-js's own default for signOut() is 'global', which ends every session of
// the account, so the scope has to be explicit.
const f = new Fixture()
let user: TestUser

const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })

async function secondDevice(): Promise<SupabaseClient> {
  const client = anon()
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw new Error(error.message)
  return client
}

// getUser() asks the Auth server, so it fails once that session is gone.
const stillSignedIn = async (client: SupabaseClient) => !(await client.auth.getUser()).error

beforeAll(async () => {
  user = await f.user('parent', 'devices')
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('signing out', () => {
  it("with scope 'local' only ends that device's session", async () => {
    const other = await secondDevice()
    expect(await stillSignedIn(user.client)).toBe(true)
    expect(await stillSignedIn(other)).toBe(true)

    await user.client.auth.signOut({ scope: 'local' })

    expect(await stillSignedIn(other)).toBe(true)
  })

  it("with the default scope ends the account's sessions on every device", async () => {
    const first = await secondDevice()
    const second = await secondDevice()

    await first.auth.signOut()

    expect(await stillSignedIn(second)).toBe(false)
  })

  it("changing the password with scope 'others' ends the other devices but keeps this one signed in", async () => {
    const other = await secondDevice()
    const thisDevice = await secondDevice()

    const { error } = await thisDevice.auth.updateUser({ password: `Changed-${Date.now()}-Pw!` })
    expect(error).toBeNull()
    await thisDevice.auth.signOut({ scope: 'others' })

    expect(await stillSignedIn(thisDevice)).toBe(true)
    expect(await stillSignedIn(other)).toBe(false)

    // Put the original password back so later tests can still sign in.
    await f.admin.auth.admin.updateUserById(user.id, { password: user.password })
  })

  it('requesting a reset link (no password change) signs nobody out', async () => {
    // What "Request Password Reset Link" does is only email a one-time link; it
    // never touches sessions. generateLink creates the same link without changing anything.
    const device = await secondDevice()
    const { error } = await f.admin.auth.admin.generateLink({ type: 'recovery', email: user.email })
    expect(error).toBeNull()
    expect(await stillSignedIn(device)).toBe(true)
  })

  it('setting a password for someone and revoking their sessions signs out every device, and the new password works', async () => {
    const a = await secondDevice()
    const b = await secondDevice()
    const newPassword = `Reset-${Date.now()}-Pw!`

    const { error } = await f.admin.auth.admin.updateUserById(user.id, { password: newPassword })
    expect(error).toBeNull()
    await revokeAllSessions({ userId: user.id, email: user.email, password: newPassword })

    expect(await stillSignedIn(a)).toBe(false)
    expect(await stillSignedIn(b)).toBe(false)

    const fresh = anon()
    expect((await fresh.auth.signInWithPassword({ email: user.email, password: newPassword })).error).toBeNull()
    expect((await anon().auth.signInWithPassword({ email: user.email, password: user.password })).error).not.toBeNull()
  })
})
