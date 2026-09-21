import { isValidName, NAME_VALIDATION_MESSAGE, toTitleCase } from '@/lib/name'
import { isValidPhoneInput, normalizePhilippineMobile, PHONE_VALIDATION_MESSAGE } from '@/lib/phone'
import { isPickupRelationship, PICKUP_RELATIONSHIP_MESSAGE } from '@/lib/pickup-relationships'

// A child's health and emergency information. Sensitive personal information
// under RA 10173, so it is only ever entered by the child's own parents (or
// admin), read by teachers and admin, and never shown to other families.
export const HEALTH_TEXT_MAX = 500
export const HEALTH_SHORT_MAX = 150
export const MAX_EMERGENCY_CONTACTS = 3

export type EmergencyContactInput = { fullName: string; relationship: string; phoneNumber: string }

export type HealthInput = {
  allergies: string
  severeAllergy: boolean
  medicalConditions: string
  medications: string
  doctorName: string
  doctorPhone: string
  preferredHospital: string
  notes: string
  contacts: EmergencyContactInput[]
}

export type StudentHealth = {
  allergies: string | null
  severe_allergy: boolean
  medical_conditions: string | null
  medications: string | null
  doctor_name: string | null
  doctor_phone: string | null
  preferred_hospital: string | null
  notes: string | null
  updated_at: string | null
}

export type EmergencyContact = { position: number; full_name: string; relationship: string; phone_number: string }

export const emptyHealthInput: HealthInput = {
  allergies: '',
  severeAllergy: false,
  medicalConditions: '',
  medications: '',
  doctorName: '',
  doctorPhone: '',
  preferredHospital: '',
  notes: '',
  contacts: [],
}

export function healthInputFrom(health: StudentHealth | null, contacts: EmergencyContact[]): HealthInput {
  return {
    allergies: health?.allergies ?? '',
    severeAllergy: health?.severe_allergy ?? false,
    medicalConditions: health?.medical_conditions ?? '',
    medications: health?.medications ?? '',
    doctorName: health?.doctor_name ?? '',
    doctorPhone: health?.doctor_phone ?? '',
    preferredHospital: health?.preferred_hospital ?? '',
    notes: health?.notes ?? '',
    contacts: [...contacts].sort((a, b) => a.position - b.position).map((c) => ({
      fullName: c.full_name,
      relationship: c.relationship,
      phoneNumber: c.phone_number,
    })),
  }
}

// Returns a cleaned copy plus an error message when something is wrong. Every
// rule here is also enforced server-side by the save action (and partly by
// database checks), since the form is UX only.
export function validateHealthInput(input: HealthInput): { error: string } | { value: HealthInput } {
  const trim = (v: string) => (v ?? '').trim()
  const clean: HealthInput = {
    allergies: trim(input.allergies),
    severeAllergy: !!input.severeAllergy,
    medicalConditions: trim(input.medicalConditions),
    medications: trim(input.medications),
    doctorName: trim(input.doctorName),
    doctorPhone: trim(input.doctorPhone),
    preferredHospital: trim(input.preferredHospital),
    notes: trim(input.notes),
    contacts: [],
  }
  for (const [label, value] of [
    ['Allergies', clean.allergies],
    ['Medical conditions', clean.medicalConditions],
    ['Medications', clean.medications],
    ['Notes', clean.notes],
  ] as const) {
    if (value.length > HEALTH_TEXT_MAX) return { error: `${label} must be ${HEALTH_TEXT_MAX} characters or fewer.` }
  }
  if (clean.doctorName.length > 100) return { error: "The doctor's name must be 100 characters or fewer." }
  if (clean.preferredHospital.length > HEALTH_SHORT_MAX) return { error: `The hospital must be ${HEALTH_SHORT_MAX} characters or fewer.` }
  if (clean.severeAllergy && !clean.allergies) return { error: 'Describe the allergy, since it is marked severe.' }
  if (clean.doctorPhone) {
    if (!isValidPhoneInput(clean.doctorPhone)) return { error: `Doctor's phone: ${PHONE_VALIDATION_MESSAGE}` }
    clean.doctorPhone = normalizePhilippineMobile(clean.doctorPhone)
  }

  const contacts = (input.contacts ?? []).filter((c) => trim(c.fullName) || trim(c.phoneNumber) || trim(c.relationship))
  if (contacts.length > MAX_EMERGENCY_CONTACTS) return { error: `Add at most ${MAX_EMERGENCY_CONTACTS} emergency contacts.` }
  for (const [i, c] of contacts.entries()) {
    const n = i + 1
    const fullName = trim(c.fullName)
    if (!fullName || !isValidName(fullName)) return { error: `Contact ${n}: ${fullName ? NAME_VALIDATION_MESSAGE : 'enter a name.'}` }
    if (!isPickupRelationship(trim(c.relationship))) return { error: `Contact ${n}: ${PICKUP_RELATIONSHIP_MESSAGE}` }
    if (!isValidPhoneInput(trim(c.phoneNumber))) return { error: `Contact ${n}: ${PHONE_VALIDATION_MESSAGE}` }
    clean.contacts.push({
      fullName: toTitleCase(fullName),
      relationship: trim(c.relationship),
      phoneNumber: normalizePhilippineMobile(trim(c.phoneNumber)),
    })
  }
  return { value: clean }
}

// The one-line alert staff see beside a child's name (attendance list etc.).
export function allergyAlert(health: Pick<StudentHealth, 'allergies' | 'severe_allergy'> | null): string | null {
  if (!health?.severe_allergy) return null
  const text = (health.allergies ?? '').trim()
  return text.length > 60 ? `${text.slice(0, 57)}...` : text || 'Severe allergy'
}

// Lowercased, accent-stripped, punctuation-free, single-spaced (same rule as the
// pickup name matching, so "Nuñez" and "nunez" are the same person).
export function nameKey(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

export type DoNotReleaseEntry = { id: string; student_id: string; first_name: string; last_name: string; note: string | null }

// Pickup Verification's do-not-release rule. An exact first + last name match is
// a hard stop ("matches"); anything looser (a fragment of either name) is only a
// "confirm the exact name" prompt ("similar"). A match overrides an authorized
// result: the caller shows only the red banner when `matches` is non-empty.
export function matchDoNotRelease(
  entries: DoNotReleaseEntry[],
  typedFirst: string,
  typedLast: string
): { matches: DoNotReleaseEntry[]; similar: DoNotReleaseEntry[] } {
  const first = nameKey(typedFirst)
  const last = nameKey(typedLast)
  if (!first && !last) return { matches: [], similar: [] }
  const matches = first && last ? entries.filter((d) => nameKey(d.first_name) === first && nameKey(d.last_name) === last) : []
  const matchIds = new Set(matches.map((d) => d.id))
  const similar = entries.filter(
    (d) =>
      !matchIds.has(d.id) &&
      (first === '' || nameKey(d.first_name).includes(first)) &&
      (last === '' || nameKey(d.last_name).includes(last))
  )
  return { matches, similar }
}
