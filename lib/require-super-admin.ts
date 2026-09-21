import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'

// Hidden features (Year-End Promotion, Do-Not-Release) are for the super admin
// only while they are unfinished. Same tier the Deleted Items page uses:
// `profiles.is_super_admin` on top of role = 'admin'. Nothing in the UI may hint
// at the tier to a regular admin, so a regular admin who opens one of these
// pages directly is simply sent back to the dashboard.
async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', userId).maybeSingle()
  return !!data?.is_super_admin
}

// For a page (Server Component): redirects instead of throwing.
export async function requireSuperAdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !(await isSuperAdmin(user.id))) redirect('/admin')
  return user
}

// For a Server Action: same check, throws like requireAdmin (the middleware skips
// Server Action requests, so the page gate alone is not protection).
export async function requireSuperAdmin() {
  const user = await requireAdmin()
  if (!(await isSuperAdmin(user.id))) {
    throw new Error('You do not have permission to do this.')
  }
  return user
}
