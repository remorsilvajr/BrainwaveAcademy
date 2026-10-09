// The fixed set of relationships a parent can pick for an authorized pickup
// person. Was free text, which let junk through and made the staff-side
// Relationship filter fragment ("Grandma", "grandmother", "Lola"). "Other"
// covers anything not listed, such as a neighbor or a driver's employer.
export const PICKUP_RELATIONSHIPS = [
  'Mother',
  'Father',
  'Stepmother',
  'Stepfather',
  'Grandmother',
  'Grandfather',
  'Aunt',
  'Uncle',
  'Older Sibling',
  'Legal Guardian',
  'Nanny / Yaya',
  'Family Driver',
  'Family Friend',
  'Other',
] as const

export const PICKUP_RELATIONSHIP_MESSAGE = 'Select the relationship to the child.'

export function isPickupRelationship(value: string) {
  return (PICKUP_RELATIONSHIPS as readonly string[]).includes(value)
}

// "Other" must say what the relationship is. It is stored in the same column as
// "Other (Neighbor)", so no schema change and it reads naturally on the card;
// staff's Relationship filter groups every "Other (...)" under Other.
export const OTHER_RELATIONSHIP = 'Other'
export const OTHER_SPEC_MAX = 40
export const OTHER_SPEC_MESSAGE = 'Please specify the relationship (letters only, up to 40 characters).'
const OTHER_PATTERN = /^Other \((.+)\)$/

export function composeOtherRelationship(spec: string): string {
  return `${OTHER_RELATIONSHIP} (${spec.trim().replace(/\s+/g, ' ')})`
}

// Splits a stored value back into the picked option and the specified text.
export function parseRelationship(value: string | null | undefined): { choice: string; other: string } {
  const match = OTHER_PATTERN.exec(value ?? '')
  return match ? { choice: OTHER_RELATIONSHIP, other: match[1] } : { choice: value ?? '', other: '' }
}

export function isValidOtherSpec(spec: string): boolean {
  const value = spec.trim().replace(/\s+/g, ' ')
  return value.length >= 2 && value.length <= OTHER_SPEC_MAX && /^\p{L}[\p{L} '\-/.]*$/u.test(value)
}

// A value that may be saved now: a listed relationship other than a bare "Other",
// or "Other (...)" with a valid specification.
export function isAllowedPickupRelationship(value: string): boolean {
  const { choice, other } = parseRelationship(value)
  if (choice === OTHER_RELATIONSHIP) return !!other && isValidOtherSpec(other)
  return isPickupRelationship(value) && value !== OTHER_RELATIONSHIP
}

// For grouping: every "Other (...)" counts as Other.
export function relationshipGroup(value: string | null | undefined): string | null {
  if (!value) return null
  return parseRelationship(value.trim()).choice || null
}
