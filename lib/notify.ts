import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

// In-app notifications (the bell in every portal's top bar). Rows are written
// with the service-role client because the person who triggers an event is
// rarely the person it's for (a parent files a request, an admin is told), and
// `notifications` has no insert policy for anyone. These are only ever called
// from a trusted server action *after* the change they describe succeeded.
//
// Best effort by design: a notification that can't be written is logged and
// never fails the action it describes.
export type NotificationInput = {
  // Picks the icon in the bell: 'money' | 'photos' | 'unenroll' | 'reminder' | 'request' | 'message'.
  kind: string
  title: string
  body?: string
  // Where clicking it goes (an in-app path).
  href?: string
  // Same key for the same user is written once, so retries and re-runs can't
  // stack duplicates (for example one "new photos" per class per day).
  dedupeKey?: string
}

// The write itself, against a caller-supplied service-role client (so the daily
// job and tests can pass their own).
export async function insertNotifications(client: SupabaseClient, userIds: string[], input: NotificationInput): Promise<void> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return
  try {
    const rows = ids.map((user_id) => ({
      user_id,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      dedupe_key: input.dedupeKey ?? null,
    }))
    const { error } = await client
      .from('notifications')
      .upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    if (error) console.error(`notify failed: ${error.message}`)
  } catch (err) {
    console.error('notify failed:', err)
  }
}

export async function notifyUsers(userIds: string[], input: NotificationInput): Promise<void> {
  await insertNotifications(createAdminClient(), userIds, input)
}

export async function notifyAdmins(input: NotificationInput): Promise<void> {
  try {
    const { data } = await createAdminClient()
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('account_status', 'active')
      .is('deleted_at', null)
    await notifyUsers((data ?? []).map((p) => p.id), input)
  } catch (err) {
    console.error('notifyAdmins failed:', err)
  }
}

// Parents linked to any still-enrolled child in a classroom.
export async function parentIdsOfClassroom(classroomId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data: students } = await admin
    .from('students')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('enrollment_status', 'active')
  const studentIds = (students ?? []).map((s) => s.id)
  if (studentIds.length === 0) return []
  const { data: links } = await admin.from('parent_student').select('parent_id').in('student_id', studentIds)
  return [...new Set((links ?? []).map((l) => l.parent_id))]
}

export async function notifyClassroomParents(classroomId: string, input: NotificationInput): Promise<void> {
  try {
    await notifyUsers(await parentIdsOfClassroom(classroomId), input)
  } catch (err) {
    console.error('notifyClassroomParents failed:', err)
  }
}

// Every parent linked to a student (a fee or a request concerns the child, not
// one particular guardian).
export async function notifyParentsOfStudent(studentId: string, input: NotificationInput): Promise<void> {
  try {
    const { data: links } = await createAdminClient().from('parent_student').select('parent_id').eq('student_id', studentId)
    await notifyUsers((links ?? []).map((l) => l.parent_id), input)
  } catch (err) {
    console.error('notifyParentsOfStudent failed:', err)
  }
}

// Every active, non-deleted account with a role (a new announcement or calendar
// event concerns everyone of that role). At school scale this is a few hundred rows
// at most; dedupeKey makes a repeat harmless.
export async function notifyRole(role: 'parent' | 'teacher', input: NotificationInput): Promise<void> {
  try {
    const { data } = await createAdminClient()
      .from('profiles')
      .select('id')
      .eq('role', role)
      .eq('account_status', 'active')
      .is('deleted_at', null)
    await notifyUsers((data ?? []).map((p) => p.id), input)
  } catch (err) {
    console.error(`notifyRole(${role}) failed:`, err)
  }
}
