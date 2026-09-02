// Parent accounts have no *independent* Gender UI control — "Mother" and
// "Father" already imply it, so those two cases infer gender from
// relationship_to_student rather than asking for it a second time.
// "Guardian" is genuinely ambiguous, though, so callers that let a parent
// pick "Guardian" also show a real Gender select for that one case and pass
// whatever was chosen through as `manualGender` — everywhere else
// (Mother/Father/unset), `manualGender` is ignored entirely, since the
// relationship alone already settles it. Teachers keep their own
// independently-chosen Gender field outside this helper.
export function genderFromParentRelationship(
  relationship: string | null | undefined,
  manualGender?: string | null
): 'male' | 'female' | null {
  if (relationship === 'Mother') return 'female'
  if (relationship === 'Father') return 'male'
  if (relationship === 'Guardian') {
    return manualGender === 'male' || manualGender === 'female' ? manualGender : null
  }
  return null
}
