import type { SupabaseClient } from '@supabase/supabase-js'
import { documentOrder } from '@/lib/documents'

// The numbers beside sidebar tabs. Two kinds:
//  - "new" badges: how many unread notifications point at that tab (a new announcement,
//    calendar event, album photos, a feedback reply, a fee, a decision...). They clear
//    when the person opens the tab (markSectionSeen) or reads the bell entry.
//  - state badges: a live count of work waiting (missing/corrected requirements for a
//    parent, pending requests for an admin). They only go down when the work is done,
//    never because the tab was opened, and they replace the notification count for
//    that tab so nothing is counted twice.

export type NavBadges = Record<string, number>

// A tab, not the portal's own dashboard ("/parent" is a prefix of every path).
const SECTION_HREF = /^\/(parent|teacher|admin)\/[a-z0-9-]+$/
export function isSectionHref(href: string): boolean {
  return SECTION_HREF.test(href)
}

// The PostgREST filter for "every notification that belongs to this tab": its own
// path, anything below it, or the path with a query string. `*` is PostgREST's
// wildcard. `href` must already have passed isSectionHref.
export function sectionSeenFilter(href: string): string {
  return `href.eq.${href},href.like.${href}/*,href.like.${href}?*`
}

function pathOf(href: string): string {
  const cut = href.search(/[?#]/)
  return cut === -1 ? href : href.slice(0, cut)
}

// Unread notifications per tab: a notification belongs to a tab when its path is the
// tab's path or below it (/parent/album/2026-09-21 belongs to /parent/album).
export function countUnreadByNavHref(unreadHrefs: (string | null)[], navHrefs: string[]): NavBadges {
  const counts: NavBadges = {}
  for (const nav of navHrefs) {
    if (!isSectionHref(nav)) continue
    let n = 0
    for (const href of unreadHrefs) {
      if (!href) continue
      const path = pathOf(href)
      if (path === nav || path.startsWith(`${nav}/`)) n += 1
    }
    counts[nav] = n
  }
  return counts
}

type RequirementApplication = { id: string; created_student_id: string | null; status: string }
type RequirementDocument = { application_id: string; document_type: string; file_url: string | null; verification_status: string }

// What a parent still has to do on Requirements, across every child that is still
// applying: each required document with no file yet, plus each uploaded document the
// admin marked as needing a correction. Uploading a missing file takes one off; a
// correction request adds one back. A rejected request, or a child who already has a
// student record, needs nothing.
export function requirementsToDo(applications: RequirementApplication[], documents: RequirementDocument[]): number {
  let total = 0
  for (const app of applications) {
    if (app.status === 'rejected' || app.created_student_id) continue
    const mine = documents.filter((d) => d.application_id === app.id)
    for (const type of documentOrder) {
      const doc = mine.find((d) => d.document_type === type)
      if (!doc || !doc.file_url) total += 1
      else if (doc.verification_status === 'needs_correction') total += 1
    }
  }
  return total
}

// The live counts, for the signed-in person's role. `supabase` is their own RLS-scoped
// client, so every query only sees what that role may see.
export async function loadStateBadges(supabase: SupabaseClient, role: string, userId: string, navHrefs: string[]): Promise<NavBadges> {
  const wants = (href: string) => navHrefs.includes(href)
  const out: NavBadges = {}

  if (role === 'parent' && wants('/parent/requirements')) {
    const { data: applications } = await supabase
      .from('applications')
      .select('id, created_student_id, status')
      .eq('created_parent_id', userId)
      .eq('hidden_from_parent', false)
    const ids = (applications ?? []).map((a) => a.id)
    const { data: documents } =
      ids.length > 0
        ? await supabase.from('application_documents').select('application_id, document_type, file_url, verification_status').in('application_id', ids)
        : { data: [] }
    out['/parent/requirements'] = requirementsToDo(applications ?? [], documents ?? [])
  }

  if (role === 'admin') {
    const count = async (query: PromiseLike<{ count: number | null }>) => (await query).count ?? 0

    if (wants('/admin/enroll-a-student')) {
      out['/admin/enroll-a-student'] = await count(
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_review')
          .eq('archived', false)
          .is('deleted_at', null)
      )
    }
    if (wants('/admin/applications')) {
      // Approved requests whose parent has uploaded a document nobody has reviewed yet.
      const { data: approved } = await supabase
        .from('applications')
        .select('id')
        .eq('status', 'approved')
        .is('created_student_id', null)
        .is('deleted_at', null)
      const ids = (approved ?? []).map((a) => a.id)
      if (ids.length === 0) {
        out['/admin/applications'] = 0
      } else {
        const { data: pending } = await supabase
          .from('application_documents')
          .select('application_id')
          .in('application_id', ids)
          .eq('verification_status', 'pending')
        out['/admin/applications'] = new Set((pending ?? []).map((d) => d.application_id)).size
      }
    }
    if (wants('/admin/unenrollment')) {
      out['/admin/unenrollment'] = await count(
        supabase.from('unenrollment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      )
    }
    if (wants('/admin/feedback')) {
      out['/admin/feedback'] = await count(supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('resolved', false))
    }
    if (wants('/admin/payments')) {
      out['/admin/payments'] = await count(
        supabase.from('wallet_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      )
    }
  }

  return out
}
