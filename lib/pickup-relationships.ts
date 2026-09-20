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
