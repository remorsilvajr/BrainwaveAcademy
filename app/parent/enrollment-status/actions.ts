'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

// RLS (parents_hide_own_rejected_applications) enforces both ownership and
// status = 'rejected' — same "trust RLS, don't duplicate the check here"
// pattern as updateStudentAvatar in app/parent/students/actions.ts. That
// policy checks parent_email rather than created_parent_id specifically
// because a rejected application never gets created_parent_id set (see the
// Requirements selectedElsewhereStatus note in CLAUDE.md) — auth_email()
// (a SECURITY DEFINER helper mirroring auth_role()) resolves the caller's
// own email for that comparison.
//
// This only ever sets hidden_from_parent — it never deletes the row or
// touches anything admin can see. See enrollment-requests-table.tsx for
// the admin-side "archive" equivalent, which is a separate flag entirely.
export async function hideRejectedApplication(applicationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('applications')
    .update({ hidden_from_parent: true })
    .eq('id', applicationId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('This application could not be removed — it may no longer be rejected, or may not belong to your account.')
  }

  await logActivity(supabase, {
    actorId: user?.id ?? null,
    action: 'Removed a rejected enrollment application from their portal view',
    targetTable: 'applications',
    targetId: applicationId,
  })

  // Busts the whole parent layout subtree, not just this page — the top
  // bar's own applications query (app/parent/layout.tsx) needs to drop this
  // row too, or the "removed" child would still show up in the selector.
  revalidatePath('/parent', 'layout')
}
