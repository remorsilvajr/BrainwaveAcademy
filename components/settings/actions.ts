'use server'

import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

// Called from ChangePasswordForm after a successful client-side
// supabase.auth.updateUser() call — the password change itself has to go
// through the browser client (it re-authenticates with the current
// password first), so this only records the audit-trail entry.
export async function logPasswordChanged() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Changed account password',
    targetTable: 'profiles',
    targetId: user?.id,
  })
}
