'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { logActivity } from '@/lib/activity-log'
import { notifyAdmins } from '@/lib/notify'
import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'

// Admin-managed list of people who must never be handed a child (a custody
// order, for example). Teachers can read it (Pickup Verification needs it),
// parents cannot: the barred person may well be another guardian.
const NOTE_MAX = 500

export async function addDoNotRelease(input: {
  studentId: string
  firstName: string
  lastName: string
  note: string
}): Promise<{ error: string } | undefined> {
  const admin = await requireAdmin()
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const note = input.note.trim()
  if (!firstName || !lastName) return { error: 'Enter both a first and a last name.' }
  if (!isValidName(firstName) || !isValidName(lastName)) return { error: NAME_VALIDATION_MESSAGE }
  if (note.length > NOTE_MAX) return { error: `The note must be ${NOTE_MAX} characters or fewer.` }

  const supabase = await createClient()
  const { data: student } = await supabase.from('students').select('id, first_name, last_name').eq('id', input.studentId).maybeSingle()
  if (!student) return { error: 'That student could not be found.' }

  const { data: created, error } = await supabase
    .from('do_not_release')
    .insert({
      student_id: input.studentId,
      first_name: toTitleCase(firstName),
      last_name: toTitleCase(lastName),
      note: note || null,
      created_by: admin.id,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  await logActivity(supabase, {
    actorId: admin.id,
    action: `Added ${toTitleCase(firstName)} ${toTitleCase(lastName)} to the do-not-release list for ${student.first_name} ${student.last_name}`,
    targetTable: 'do_not_release',
    targetId: created.id,
  })
  revalidatePath('/admin/do-not-release')
  revalidatePath('/admin/pickup-verification')
  revalidatePath('/teacher/pickup-verification')
}

export async function removeDoNotRelease(id: string): Promise<{ error: string } | undefined> {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: removed, error } = await supabase.from('do_not_release').delete().eq('id', id).select('first_name, last_name')
  if (error) return { error: error.message }
  if (!removed || removed.length === 0) return { error: 'That entry could not be found.' }

  await logActivity(supabase, {
    actorId: admin.id,
    action: `Removed ${removed[0].first_name} ${removed[0].last_name} from the do-not-release list`,
    targetTable: 'do_not_release',
    targetId: id,
  })
  revalidatePath('/admin/do-not-release')
  revalidatePath('/admin/pickup-verification')
  revalidatePath('/teacher/pickup-verification')
}

// Called when a teacher or admin's pickup lookup lands on someone on the list.
// It re-derives the caller's role itself (Server Actions bypass the portal
// middleware), records the hit, and tells every admin at once.
export async function logDoNotReleaseHit(entryId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') return { error: 'Only teachers and admins can do this.' }

  // Read through RLS (teachers and admin may read the list).
  const { data: entry } = await supabase.from('do_not_release').select('id, first_name, last_name, student_id').eq('id', entryId).maybeSingle()
  if (!entry) return { error: 'That entry could not be found.' }
  const { data: student } = await supabase.from('students').select('first_name, last_name').eq('id', entry.student_id).maybeSingle()

  await logActivity(supabase, {
    actorId: user.id,
    action: `DO NOT RELEASE match at pickup: ${entry.first_name} ${entry.last_name}`,
    targetTable: 'students',
    targetId: entry.student_id,
  })
  await notifyAdmins({
    kind: 'request',
    title: 'Do-not-release person at pickup',
    body: `${entry.first_name} ${entry.last_name} was looked up at pickup${student ? ` for ${student.first_name} ${student.last_name}` : ''}.`,
    href: '/admin/do-not-release',
  })
}
