// Every parent-facing `applications` query filters to "this parent's own
// applications" the same way: match by created_parent_id (only set once
// admin approves the enrollment request itself) OR by parent_email (a
// still-pending or already-rejected request never gets created_parent_id
// set — see the Requirements selectedElsewhereStatus note in CLAUDE.md).
// Six call sites duplicated this exact .or() string before a parent could
// hide a rejected application from their own view — extracted here so a
// filter that every one of them needs (like hidden_from_parent) only needs
// adding once. Callers still add `.eq('hidden_from_parent', false)`
// themselves alongside this, since a couple of narrower queries (e.g.
// Requirements' created_parent_id-only lookup) don't need it at all.
export function parentApplicationsFilter(user: { id?: string; email?: string } | null | undefined) {
  return `created_parent_id.eq.${user?.id ?? ''},parent_email.eq.${user?.email ?? ''}`
}
