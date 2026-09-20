'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/require-admin'

// Same pattern as app/admin/applications/actions.ts's getSignedDocumentUrl:
// the bug-reports bucket has no SELECT policy at all (see the schema note
// in CLAUDE.md), so only the service-role client can read it back, and
// requireAdmin() is what stops that from being a wide-open read of every
// user's screenshots — never remove it from here.
export async function getFeedbackImageUrl(path: string): Promise<{ error: string } | { url: string }> {
  await requireAdmin()

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('bug-reports').createSignedUrl(path, 60 * 5)

  if (error || !data) {
    return { error: error?.message ?? 'Could not generate an image link.' }
  }

  return { url: data.signedUrl }
}
