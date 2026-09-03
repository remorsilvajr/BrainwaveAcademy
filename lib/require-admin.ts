import { createClient } from '@/lib/supabase/server'

// Server-side authorization check for a Server Action, independent of any
// page-level gating. middleware.ts explicitly skips its role-based
// redirect logic for Server Action requests (see the Server Action /
// Middleware note there) — a POST to a Server Action reaches the function
// directly, so hiding a button in the admin-only UI is not real
// protection on its own. This matters most for an action that goes on to
// use the service-role client (lib/supabase/admin.ts), which bypasses RLS
// entirely — for those, this call is the *only* thing standing between
// "any authenticated (or unauthenticated) caller" and a privileged write.
// Call it first, before any privileged work, in any such action.
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to do this.')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('You do not have permission to do this.')
  }

  return user
}
