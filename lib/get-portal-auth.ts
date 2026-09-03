import { createClient } from '@/lib/supabase/server'

export type PortalRole = 'admin' | 'teacher' | 'parent'

export type PortalAuth = {
  role: PortalRole
  firstName: string
  lastName: string
  avatarUrl: string | null
} | null

// Shared by every public page that can now render for a logged-in visitor
// (the landing page, Privacy Policy, Terms of Service — see SiteHeader) so
// the "am I logged in, and as what role" lookup isn't duplicated per page.
// Returns null for a signed-out visitor, or if the profile row can't be
// read for any reason — callers should treat null exactly like "not logged
// in" rather than erroring.
export async function getPortalAuth(): Promise<PortalAuth> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    role: profile.role as PortalRole,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatarUrl: profile.avatar_url,
  }
}
