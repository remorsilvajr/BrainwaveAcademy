import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Mail } from '@/lib/notification-emails'
import { runDailyNotifications } from '@/lib/daily-notifications'
import { Fixture, type TestUser } from './helpers'

// The once-a-day job (fee reminders, new-photos email), run for real against the
// live database with a fake mailer, so no email is ever sent.
//
// It uses the service role and the live tables, so two things keep it away from
// real families:
//  - "today" is a far-future date. Reminders only look at fees due within days of
//    it and the album digest only at photos dated exactly that day, so no real
//    fee or photo can match.
//  - The job's 90-day cleanup deletes notifications and notification_log rows
//    older than the cutoff, which for a 2031 "today" is every real row. The client
//    is wrapped so those two tables can't be deleted from. (The cleanup itself is
//    the one part not exercised here.)
// The album digest does read every active student in the photo's class, so real
// parents are visited too (the fake mailer swallows it); the log rows that leaves
// behind are removed at the end, and assertions only look at the test parents.
const TODAY = '2031-06-15'
const f = new Fixture()
let parent: TestUser
let optedOut: TestUser
let childOfParent: string
let childOfOptedOut: string
let teacher: TestUser
let classroomId: string
const feeIds: string[] = []

type Sent = { to: string; mail: Mail }

function withoutCleanupDeletes(client: SupabaseClient): SupabaseClient {
  const protectedTables = new Set(['notifications', 'notification_log'])
  const bindMethods = (target: object) =>
    new Proxy(target, {
      get(t, prop) {
        const value = Reflect.get(t, prop, t)
        return typeof value === 'function' ? value.bind(t) : value
      },
    })
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'from') {
        return (table: string) => {
          const builder = target.from(table)
          if (!protectedTables.has(table)) return builder
          return new Proxy(builder, {
            get(b, p) {
              if (p === 'delete') return () => ({ lt: async () => ({ data: null, error: null }) })
              const value = Reflect.get(b, p, b)
              return typeof value === 'function' ? value.bind(b) : value
            },
          })
        }
      }
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : bindMethods(value as object)
    },
  }) as SupabaseClient
}

const run = async (send: (to: string, mail: Mail) => Promise<void>) =>
  runDailyNotifications({ admin: withoutCleanupDeletes(f.admin), send, today: TODAY, siteUrl: 'https://example.test' })

const recorder = () => {
  const sent: Sent[] = []
  return { sent, send: async (to: string, mail: Mail) => void sent.push({ to, mail }) }
}
const to = (sent: Sent[], user: TestUser) => sent.filter((s) => s.to === user.email)

const fee = async (studentId: string, dueDate: string, description: string) => {
  const { data, error } = await f.admin
    .from('payments')
    .insert({ student_id: studentId, amount: 500, fee_type: 'other', description, status: 'pending', due_date: dueDate })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message)
  feeIds.push(data.id)
  return data.id as string
}
const bell = async (user: TestUser) => (await f.admin.from('notifications').select('kind, title, href').eq('user_id', user.id)).data ?? []
const logged = async (pattern: string) => (await f.admin.from('notification_log').select('dedupe_key').like('dedupe_key', pattern)).data ?? []

beforeAll(async () => {
  parent = await f.user('parent', 'reminded')
  optedOut = await f.user('parent', 'optedout')
  teacher = await f.user('teacher', 'photographer')
  await f.admin.from('profiles').update({ email_notifications_enabled: false }).eq('id', optedOut.id)
  const { data: classroom } = await f.admin.from('classrooms').select('id').eq('slug', 'little-explorers').single()
  classroomId = classroom!.id
  childOfParent = await f.student(parent, { classroom_id: classroomId, enrollment_status: 'active', first_name: 'Reminded' })
  childOfOptedOut = await f.student(optedOut, { classroom_id: classroomId, enrollment_status: 'active', first_name: 'Optedout' })
}, 120_000)

afterAll(async () => {
  await f.admin.from('notification_log').delete().like('dedupe_key', `album:${TODAY}:%`)
  for (const id of feeIds) await f.admin.from('notification_log').delete().like('dedupe_key', `fee:${id}:%`)
  await f.cleanup()
})

describe('fee reminders', () => {
  let dueSoon: string
  let overdue: string
  let tooOld: string
  let farAway: string

  beforeAll(async () => {
    dueSoon = await fee(childOfParent, '2031-06-17', 'Due in two days')
    overdue = await fee(childOfParent, '2031-06-10', 'Five days late')
    tooOld = await fee(childOfParent, '2031-05-01', 'Over a month late')
    farAway = await fee(childOfParent, '2031-07-15', 'Next month')
    await fee(childOfOptedOut, '2031-06-16', 'Opted-out parent fee')
  })

  it('a failed email is not logged, so the next run tries again', async () => {
    const result = await run(async (address) => {
      if (address === parent.email) throw new Error('mail server down')
    })
    expect(result.errors.some((e) => e.includes('fee reminder email'))).toBe(true)
    expect(await logged(`fee:${dueSoon}:%`)).toHaveLength(0)
    expect(await logged(`fee:${overdue}:%`)).toHaveLength(0)
  })

  it('sends one grouped email covering the due-soon and the overdue fee, and skips the rest', async () => {
    const { sent, send } = recorder()
    await run(send)
    const mine = to(sent, parent)
    expect(mine).toHaveLength(1)
    const body = JSON.stringify(mine[0].mail)
    expect(body).toContain('Due in two days')
    expect(body).toContain('Five days late')
    expect(body).not.toContain('Over a month late')
    expect(body).not.toContain('Next month')
    expect((await logged(`fee:${dueSoon}:due_soon`)).length).toBe(1)
    expect((await logged(`fee:${overdue}:overdue`)).length).toBe(1)
    expect(await logged(`fee:${tooOld}:%`)).toHaveLength(0)
    expect(await logged(`fee:${farAway}:%`)).toHaveLength(0)
  })

  it('a second run the same day sends nothing new', async () => {
    const { sent, send } = recorder()
    await run(send)
    expect(to(sent, parent)).toHaveLength(0)
  })

  it('a parent who turned off emails still gets the bell notification but no email', async () => {
    const { sent, send } = recorder()
    // Their fee was logged as reminded by the first successful run above (opt-out is
    // counted as handled), so it is the bell entry that proves it happened.
    await run(send)
    expect(to(sent, optedOut)).toHaveLength(0)
    const entries = await bell(optedOut)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'reminder', href: '/parent/payments' })
  })

  it('the parent with an email also has one bell entry, worded for an overdue fee', async () => {
    const entries = await bell(parent)
    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('A fee is past due')
  })

  it('does not remind about a fee for a child who is no longer enrolled', async () => {
    const withdrawn = await f.user('parent', 'withdrawnfee')
    const child = await f.student(withdrawn, { classroom_id: classroomId, enrollment_status: 'withdrawn' })
    const id = await fee(child, '2031-06-16', 'Withdrawn child fee')
    const { sent, send } = recorder()
    await run(send)
    expect(to(sent, withdrawn)).toHaveLength(0)
    expect(await logged(`fee:${id}:%`)).toHaveLength(0)
  })

  it('does not remind about a fee that is already paid', async () => {
    const id = await fee(childOfParent, '2031-06-16', 'Already paid')
    await f.admin.from('payments').update({ status: 'paid' }).eq('id', id)
    const { sent, send } = recorder()
    await run(send)
    expect(to(sent, parent)).toHaveLength(0)
    expect(await logged(`fee:${id}:%`)).toHaveLength(0)
  })
})

describe('new-photos email', () => {
  beforeAll(async () => {
    const rows = [1, 2, 3].map(() => ({
      album_date: TODAY,
      uploaded_by: teacher.id,
      classroom_id: classroomId,
      storage_path: `${teacher.id}/${randomUUID()}.jpg`,
    }))
    const { error } = await f.admin.from('album_photos').insert(rows)
    if (error) throw new Error(error.message)
  })

  it('sends each opted-in parent one digest with the number of photos, and respects the opt-out', async () => {
    const { sent, send } = recorder()
    await run(send)
    const mine = to(sent, parent)
    expect(mine).toHaveLength(1)
    expect(mine[0].mail.subject).toBe('New photos from school (3)')
    expect(mine[0].mail.html).toContain('3 photos')
    expect(to(sent, optedOut)).toHaveLength(0)
    expect((await logged(`album:${TODAY}:${parent.id}`)).length).toBe(1)
    expect((await logged(`album:${TODAY}:${optedOut.id}`)).length).toBe(1)
  })

  it('the same day again sends no second digest', async () => {
    const { sent, send } = recorder()
    await run(send)
    expect(to(sent, parent)).toHaveLength(0)
  })

  it('a failed digest is retried on the next run', async () => {
    const late = await f.user('parent', 'digestretry')
    await f.student(late, { classroom_id: classroomId, enrollment_status: 'active' })

    await run(async (address) => {
      if (address === late.email) throw new Error('mail server down')
    })
    expect(await logged(`album:${TODAY}:${late.id}`)).toHaveLength(0)

    const { sent, send } = recorder()
    await run(send)
    expect(to(sent, late)).toHaveLength(1)
    expect((await logged(`album:${TODAY}:${late.id}`)).length).toBe(1)
  })
})
