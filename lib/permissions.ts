// Super admin is a flag on top of the existing 'admin' role
// (profiles.is_super_admin), not a new user_role enum value — see the
// "Super admin" note in CLAUDE.md for why: every existing admin RLS policy
// and the middleware's role-based routing are keyed on role = 'admin'
// throughout the app, so a super admin's profiles.role stays 'admin' and
// they get the admin portal completely unchanged (same routes, same
// sidebar, same everything) for free. The only place the two diverge is
// this permission check.
export type AccountForBlocking = { role: string; is_super_admin: boolean }

// Can `actor` block `target`'s account?
//
// - A super admin account can never be blocked, by anyone — not even by
//   another super admin, and not by itself.
// - A regular admin can't block ANY role = 'admin' account — which,
//   structurally, already covers super admins too (their role is still
//   'admin'), so that case never needs its own check.
// - A super admin can block admins, parents, and teachers.
// - Parent/teacher targets are blockable by both, unchanged from before.
//
// Deliberately does NOT gate *unblocking* — see toggleBlockUser's own
// comment for why an already-blocked protected account should still be
// recoverable rather than permanently stuck.
export function canBlockAccount(actor: AccountForBlocking, target: AccountForBlocking): boolean {
  if (target.is_super_admin) return false
  if (target.role === 'admin' && !actor.is_super_admin) return false
  return true
}
