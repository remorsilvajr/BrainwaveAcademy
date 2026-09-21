import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

// Ends every session of an account on every device. Supabase's admin API only signs
// out by token (there is no "sign out user X"), so this signs in once with the
// password that was just set, on a throwaway client that never persists anything, and
// uses that session's token to revoke them all (the throwaway one included).
//
// If that sign-in fails (a banned or blocked account can't sign in, which also means
// its sessions already fail), it falls back to the brief ban "Log Out" uses, which
// makes every open session fail its next check and drop itself.
//
// Server-only. The password is used for that one sign-in and never logged.
export async function revokeAllSessions(input: { userId: string; email: string; password: string }): Promise<void> {
  const admin = createAdminClient()
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data } = await client.auth.signInWithPassword({ email: input.email, password: input.password })
  if (data.session) {
    const { error } = await admin.auth.admin.signOut(data.session.access_token, 'global')
    if (!error) return
  }

  await admin.auth.admin.updateUserById(input.userId, { ban_duration: '15s' })
}
