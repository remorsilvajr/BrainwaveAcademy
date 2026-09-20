// An authorized pickup person's name is stored as first/middle/last, like every
// other person in this app. The middle name is optional and never used for
// matching at pickup. `last_name` is nullable at the DB level only because a
// row migrated from the old single `full_name` column may have been one word.
export type PickupNameParts = {
  first_name: string | null
  middle_name: string | null
  last_name: string | null
}

export function pickupDisplayName(p: PickupNameParts) {
  return [p.first_name, p.middle_name, p.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}
