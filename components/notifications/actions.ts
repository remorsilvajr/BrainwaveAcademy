'use server'

import { createClient } from '@/lib/supabase/server'

export type NotificationItem = {
  id: string
  kind: string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

const RECENT_LIMIT = 20

// Own notifications only: `notifications` RLS is select/update-own, so no
// ownership filter is needed here. Returns an empty list (not an error) if the
// table can't be read, so a hiccup never breaks a top bar on every page.
export async function getMyNotifications(): Promise<{ items: NotificationItem[]; unread: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { items: [], unread: 0 }

  const [{ data: items, error }, { count }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, kind, title, body, href, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ])
  if (error) return { items: [], unread: 0 }
  return { items: items ?? [], unread: count ?? 0 }
}

// With ids: those notifications. Without: every unread one ("mark all read").
export async function markNotificationsRead(ids?: string[]): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' }

  let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (ids) {
    if (ids.length === 0) return
    query = query.in('id', ids)
  }
  const { error } = await query
  if (error) return { error: error.message }
}
