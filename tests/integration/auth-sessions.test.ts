import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
})
