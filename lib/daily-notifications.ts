import type { SupabaseClient } from '@supabase/supabase-js'
import { insertNotifications } from '@/lib/notify'
import {
  albumDigestEmail,
  feeReminderEmail,
  type AlbumDigestEntry,
  type DueFee,
  type Mail,
} from '@/lib/notification-emails'

// The once-a-day job (Vercel cron, see app/api/cron/daily/route.ts): fee
// reminders and the new-photos email. Written against injected dependencies (a
// database client, a mailer, "today") so it can be run in a test with a fake
// mailer and no real emails.
//
// What a parent can opt out of (Settings > email notifications): the emails
// here. The bell notification for a reminder is always created. Decision
// emails (enrollment, wallet, unenrollment) aren't sent from here and always go.

export type DailyDeps = {
  admin: SupabaseClient
  send: (to: string, mail: Mail) => Promise<void>
  today: string
  siteUrl: string
}

export type DailySummary = {
  reminderParents: number
  reminderEmails: number
  albumEmails: number
  skippedOptOut: number
  errors: string[]
}

// A fee is reminded once when it comes within this many days of its due date,
// and once more the first day it is overdue. Nothing older than the window is
// chased (the fee is already flagged Overdue in the admin's Payments).
const DUE_SOON_DAYS = 3
const OVERDUE_WINDOW_DAYS = 30
const RETENTION_DAYS = 90

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

type ParentInfo = { id: string; email: string; first_name: string; email_notifications_enabled: boolean }

async function loadParents(admin: SupabaseClient, ids: string[]): Promise<Map<string, ParentInfo>> {
  const map = new Map<string, ParentInfo>()
  if (ids.length === 0) return map
  const { data } = await admin
    .from('profiles')
    .select('id, email, first_name, email_notifications_enabled')
    .in('id', ids)
    .eq('role', 'parent')
    .eq('account_status', 'active')
    .is('deleted_at', null)
  for (const p of data ?? []) map.set(p.id, p)
  return map
}

async function alreadyLogged(admin: SupabaseClient, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set()
  const { data } = await admin.from('notification_log').select('dedupe_key').in('dedupe_key', keys)
  return new Set((data ?? []).map((r) => r.dedupe_key))
}

async function log(admin: SupabaseClient, keys: string[]) {
  if (keys.length === 0) return
  await admin
    .from('notification_log')
    .upsert(keys.map((dedupe_key) => ({ dedupe_key })), { onConflict: 'dedupe_key', ignoreDuplicates: true })
}

export async function runDailyNotifications(deps: DailyDeps): Promise<DailySummary> {
  const summary: DailySummary = { reminderParents: 0, reminderEmails: 0, albumEmails: 0, skippedOptOut: 0, errors: [] }

  try {
    await sendFeeReminders(deps, summary)
  } catch (err) {
    summary.errors.push(`fee reminders: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    await sendAlbumDigests(deps, summary)
  } catch (err) {
    summary.errors.push(`album digests: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    // Housekeeping so these two tables don't grow forever: nothing here is
    // needed after 90 days (a reminder's dedupe key only matters around its due
    // date, and nobody scrolls back three months in the bell).
    const cutoff = `${shiftDays(deps.today, -RETENTION_DAYS)}T00:00:00Z`
    await deps.admin.from('notifications').delete().lt('created_at', cutoff)
    await deps.admin.from('notification_log').delete().lt('created_at', cutoff)
  } catch (err) {
    summary.errors.push(`cleanup: ${err instanceof Error ? err.message : String(err)}`)
  }
  return summary
}

async function sendFeeReminders(deps: DailyDeps, summary: DailySummary) {
  const { admin, send, today, siteUrl } = deps

  const { data: fees } = await admin
    .from('payments')
    .select('id, student_id, amount, description, fee_type, due_date')
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lte('due_date', shiftDays(today, DUE_SOON_DAYS))
    .gte('due_date', shiftDays(today, -OVERDUE_WINDOW_DAYS))
  if (!fees || fees.length === 0) return

  const studentIds = [...new Set(fees.map((f) => f.student_id))]
  const { data: students } = await admin
    .from('students')
    .select('id, first_name, last_name')
    .in('id', studentIds)
    .eq('enrollment_status', 'active')
  const studentById = new Map((students ?? []).map((s) => [s.id, s]))

  const candidates = fees
    .filter((f) => studentById.has(f.student_id))
    .map((f) => {
      const overdue = f.due_date < today
      return { ...f, overdue, key: `fee:${f.id}:${overdue ? 'overdue' : 'due_soon'}` }
    })
  const done = await alreadyLogged(admin, candidates.map((c) => c.key))
  const fresh = candidates.filter((c) => !done.has(c.key))
  if (fresh.length === 0) return

  const { data: links } = await admin
    .from('parent_student')
    .select('parent_id, student_id')
    .in('student_id', [...new Set(fresh.map((f) => f.student_id))])
  const parents = await loadParents(admin, [...new Set((links ?? []).map((l) => l.parent_id))])

  const feesByParent = new Map<string, typeof fresh>()
  for (const link of links ?? []) {
    if (!parents.has(link.parent_id)) continue
    const mine = fresh.filter((f) => f.student_id === link.student_id)
    feesByParent.set(link.parent_id, [...(feesByParent.get(link.parent_id) ?? []), ...mine])
  }

  const failedKeys = new Set<string>()
  for (const [parentId, list] of feesByParent) {
    const parent = parents.get(parentId)!
    summary.reminderParents += 1
    const overdueCount = list.filter((f) => f.overdue).length

    await insertNotifications(admin, [parentId], {
      kind: 'reminder',
      title: overdueCount > 0 ? 'A fee is past due' : 'A fee is due soon',
      body: `${list.length} fee${list.length === 1 ? '' : 's'} need${list.length === 1 ? 's' : ''} your attention.`,
      href: '/parent/payments',
      dedupeKey: `fee-reminder:${today}`,
    })

    if (!parent.email_notifications_enabled) {
      summary.skippedOptOut += 1
      continue
    }
    const dueFees: DueFee[] = list.map((f) => {
      const student = studentById.get(f.student_id)!
      return {
        studentName: `${student.first_name} ${student.last_name}`,
        description: f.description || `${f.fee_type} fee`,
        amount: f.amount,
        dueDate: f.due_date,
        overdue: f.overdue,
      }
    })
    try {
      await send(parent.email, feeReminderEmail({ parentFirstName: parent.first_name, fees: dueFees, siteUrl }))
      summary.reminderEmails += 1
    } catch (err) {
      // Not logged, so tomorrow's run tries these fees again.
      for (const f of list) failedKeys.add(f.key)
      summary.errors.push(`fee reminder email to a parent failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  await log(admin, fresh.map((f) => f.key).filter((k) => !failedKeys.has(k)))
}

async function sendAlbumDigests(deps: DailyDeps, summary: DailySummary) {
  const { admin, send, today, siteUrl } = deps

  const { data: photos } = await admin.from('album_photos').select('classroom_id').eq('album_date', today).not('classroom_id', 'is', null)
  if (!photos || photos.length === 0) return

  const countByClassroom = new Map<string, number>()
  for (const p of photos) countByClassroom.set(p.classroom_id, (countByClassroom.get(p.classroom_id) ?? 0) + 1)

  const classroomIds = [...countByClassroom.keys()]
  const [{ data: classrooms }, { data: students }] = await Promise.all([
    admin.from('classrooms').select('id, name').in('id', classroomIds),
    admin.from('students').select('id, classroom_id').in('classroom_id', classroomIds).eq('enrollment_status', 'active'),
  ])
  const classroomName = new Map((classrooms ?? []).map((c) => [c.id, c.name]))
  const studentClassroom = new Map((students ?? []).map((s) => [s.id, s.classroom_id as string]))
  if (studentClassroom.size === 0) return

  const { data: links } = await admin.from('parent_student').select('parent_id, student_id').in('student_id', [...studentClassroom.keys()])
  const parents = await loadParents(admin, [...new Set((links ?? []).map((l) => l.parent_id))])

  const classroomsByParent = new Map<string, Set<string>>()
  for (const link of links ?? []) {
    if (!parents.has(link.parent_id)) continue
    const set = classroomsByParent.get(link.parent_id) ?? new Set<string>()
    set.add(studentClassroom.get(link.student_id)!)
    classroomsByParent.set(link.parent_id, set)
  }

  const keys = [...classroomsByParent.keys()].map((id) => `album:${today}:${id}`)
  const done = await alreadyLogged(admin, keys)
  const sent: string[] = []

  for (const [parentId, classroomSet] of classroomsByParent) {
    const key = `album:${today}:${parentId}`
    if (done.has(key)) continue
    const parent = parents.get(parentId)!
    if (!parent.email_notifications_enabled) {
      summary.skippedOptOut += 1
      sent.push(key)
      continue
    }
    const entries: AlbumDigestEntry[] = [...classroomSet].map((id) => ({
      classroomName: classroomName.get(id) ?? 'Your class',
      count: countByClassroom.get(id) ?? 0,
    }))
    try {
      await send(parent.email, albumDigestEmail({ parentFirstName: parent.first_name, date: today, entries, siteUrl }))
      summary.albumEmails += 1
      sent.push(key)
    } catch (err) {
      summary.errors.push(`album email to a parent failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  await log(admin, sent)
}
