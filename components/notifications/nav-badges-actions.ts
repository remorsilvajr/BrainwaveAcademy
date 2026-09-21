'use server'

import { createClient } from '@/lib/supabase/server'
import { countUnreadByNavHref, isSectionHref, loadStateBadges, sectionSeenFilter, type NavBadges } from '@/lib/nav-badges'

const MAX_TABS = 40

// The numbers for the sidebar, for the signed-in person only (every query is
// RLS-scoped to them). `hrefs` are the tabs the sidebar is showing. Never throws: a
// hiccup returns no badges rather than breaking every page.
export async function getNavBadges(hrefs: string[]): Promise<NavBadges> {
  try {
    const tabs = (Array.isArray(hrefs) ? hrefs : []).filter((h): h is string => typeof h === 'string' && isSectionHref(h)).slice(0, MAX_TABS)
    if (tabs.length === 0) return {}

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return {}

    const [{ data: profile }, { data: unread }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase.from('notifications').select('href').is('read_at', null).limit(1000),
    ])

    const counts = countUnreadByNavHref((unread ?? []).map((n) => n.href), tabs)
    const state = await loadStateBadges(supabase, profile?.role ?? '', user.id, tabs)
    return { ...counts, ...state }
  } catch {
    return {}
  }
}

// Opening a tab clears its "new" notifications (the bell entries pointing at it and
// anything under it, e.g. an album day). State badges are unaffected.
export async function markSectionSeen(href: string): Promise<void> {
  if (typeof href !== 'string' || !isSectionHref(href)) return
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      // href is one of our own tab paths (validated above), so it is safe in the filter.
      .or(sectionSeenFilter(href))
  } catch {
    // best effort
  }
}
