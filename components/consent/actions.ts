'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { isTerminalStudentStatus } from '@/lib/student-status'

// A parent sets whether their child may appear in class photos. Runs on the
// parent's own client: parents_update_own_children_avatar only matches their
// linked children, and enforce_students_parent_lock lets them change only the
// avatar and these consent columns.
export async function setPhotoConsent(studentId: string, allowed: boolean): Promise<{ error: string } | undefined> {
  if (typeof allowed !== 'boolean') return { error: 'Choose allowed or not allowed.' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, enrollment_status')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return { error: 'This child could not be found.' }
  if (isTerminalStudentStatus(student.enrollment_status)) return { error: 'This child is no longer enrolled.' }

  const { data: updated, error } = await supabase
    .from('students')
    .update({ photo_consent: allowed, photo_consent_updated_at: new Date().toISOString() })
    .eq('id', studentId)
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'You can only change this for your own child.' }

  await logActivity(supabase, {
    actorId: user.id,
    action: `${allowed ? 'Allowed' : 'Did not allow'} ${student.first_name} in class photos`,
    targetTable: 'students',
    targetId: studentId,
  })

  revalidatePath('/parent/settings')
  revalidatePath('/parent/album')
  revalidatePath('/parent')
  revalidatePath('/teacher/album')
}
