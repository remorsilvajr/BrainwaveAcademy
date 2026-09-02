// Parent accounts have no Gender UI control of their own — it's inferred
// from relationship_to_student, which every parent-facing form/action
// already captures (public /enroll, /parent/enroll-a-student, Create New
// Account, User Management's Edit modal, and a parent's own My Profile).
// "Guardian" (or no relationship at all) is genuinely ambiguous, so it's
// left unset rather than guessed. Teachers keep an explicit, independently
// chosen Gender field — this helper is parent-only.
export function genderFromParentRelationship(relationship: string | null | undefined): 'male' | 'female' | null {
  if (relationship === 'Mother') return 'female'
  if (relationship === 'Father') return 'male'
  return null
}
