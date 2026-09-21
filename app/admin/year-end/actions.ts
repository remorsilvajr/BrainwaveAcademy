'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { applyYearEndDecisions, type YearEndDecision, type YearEndResult } from '@/lib/year-end'

// Thin wrapper: the admin check and the request-scoped client live here, the
// logic lives in lib/year-end.ts so it can be exercised directly. Returns
// `{ error }` instead of throwing for anything expected (a thrown Server
// Function error is redacted in a production build).
export async function applyYearEnd(
  schoolYear: string,
  decisions: YearEndDecision[]
): Promise<{ error: string } | YearEndResult> {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const result = await applyYearEndDecisions(supabase, admin.id, schoolYear, decisions)
  if ('error' in result) return result

  for (const path of [
    '/admin/year-end',
    '/admin/students',
    '/admin/classrooms',
    '/admin/payments',
    '/admin/attendance',
    '/admin',
    '/teacher',
    '/teacher/attendance',
    '/parent/students',
    '/parent/payments',
    '/parent/pickup',
  ]) {
    revalidatePath(path)
  }

  return result
}
