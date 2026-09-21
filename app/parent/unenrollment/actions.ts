'use server'

import { revalidatePath } from 'next/cache'
import { notifyAdmins } from '@/lib/notify'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { validateLastDay, validateReason } from '@/lib/unenrollment'

// Both actions return `{ error }` instead of throwing (a thrown Server Function
// error is redacted in a production build). Ownership of the child is enforced
// by RLS on the regular client: the insert/cancel policies only allow a parent
// linked to that student, so nothing here needs a service-role client.

export async function requestUnenrollment(
  studentId: string,
  reason: string,
  lastDay: string
): Promise<{ error: string } | undefined> {
  const reasonError = validateReason(reason)
  if (reasonError) return { error: reasonError }
  const dayError = validateLastDay(lastDay)
  if (dayError) return { error: dayError }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  // Read through RLS (parents_view_own_children), so a child that isn't theirs
  // simply isn't found.
  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name, enrollment_status')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) {
    return { error: 'That student could not be found.' }
  }
  if (student.enrollment_status !== 'active') {
    return { error: `${student.first_name} is not currently enrolled.` }
  }

  const { data: created, error } = await supabase
    .from('unenrollment_requests')
    .insert({ student_id: studentId, requested_by: user.id, reason: reason.trim(), last_day: lastDay })
    .select('id')
    .single()
  if (error) {
    // The partial unique index allows only one pending request per student.
    if (error.code === '23505') {
      return { error: `There is already a pending unenrollment request for ${student.first_name}.` }
    }
    return { error: error.message }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: `Requested unenrollment for ${student.first_name} ${student.last_name}`,
    targetTable: 'unenrollment_requests',
    targetId: created.id,
  })

  await notifyAdmins({
    kind: 'unenroll',
    title: 'New unenrollment request',
    body: `A parent asked to unenroll ${student.first_name} ${student.last_name}.`,
    href: '/admin/unenrollment',
    dedupeKey: `unenroll-request:${created.id}`,
  })

  revalidatePath('/parent/unenrollment')
  revalidatePath('/admin/unenrollment')
  revalidatePath('/admin')
}

export async function cancelUnenrollmentRequest(requestId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session has expired. Please log in again.' }
  }

  // RLS only lets a parent move their own *pending* request to 'cancelled', and
  // the row lock trigger rejects changing anything else.
  const { data: updated, error } = await supabase
    .from('unenrollment_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
  if (error) {
    return { error: error.message }
  }
  if (!updated || updated.length === 0) {
    return { error: 'This request can no longer be cancelled.' }
  }

  await logActivity(supabase, {
    actorId: user.id,
    action: 'Cancelled an unenrollment request',
    targetTable: 'unenrollment_requests',
    targetId: requestId,
  })

  revalidatePath('/parent/unenrollment')
  revalidatePath('/admin/unenrollment')
  revalidatePath('/admin')
}
