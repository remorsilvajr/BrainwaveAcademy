import { createHmac, timingSafeEqual } from 'crypto'
import { requireEnv } from '@/lib/env'

// A Pickup ID is the code in the QR on an authorized pickup person's card:
//   BWPID1.<authorized_pickups.id>.<signature>
// The signature is an HMAC of the id under a key derived from the service-role
// secret, so nobody can print a card for an id they made up, and nothing needs to
// be stored: verifying re-signs and compares, then looks the person up. The card
// only proves "this person is on file"; staff still compare the photo with the
// person in front of them. Removing the person from the list voids the card (the
// lookup finds nothing). Rotating the service-role key invalidates every card.
// Server only: never import this from a client component.
const PREFIX = 'BWPID1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function signature(pickupId: string): string {
  const key = createHmac('sha256', requireEnv('SUPABASE_SERVICE_ROLE_KEY')).update('brainwave-pickup-id-v1').digest()
  return createHmac('sha256', key).update(pickupId.toLowerCase()).digest('hex').slice(0, 20)
}

export function pickupIdCode(pickupId: string): string {
  return `${PREFIX}.${pickupId.toLowerCase()}.${signature(pickupId)}`
}

// A short readable form for the printed card, e.g. "PU-3FA9-C210". Staff can type it
// into Pickup Verification when there's no camera: the server finds the person whose
// signature starts with it (findPickupIdByLabel). It comes from the signature, so it
// can't be made up for a person, and staff still compare the photo.
export function pickupIdLabel(pickupId: string): string {
  const sig = signature(pickupId).toUpperCase()
  return `PU-${sig.slice(0, 4)}-${sig.slice(4, 8)}`
}

// The authorized_pickups id inside a scanned code, or null if the code is not one of
// ours or its signature does not match.
export function parsePickupIdCode(raw: string): string | null {
  const parts = raw.trim().split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX || !UUID.test(parts[1])) return null
  const expected = Buffer.from(signature(parts[1]))
  const given = Buffer.from(parts[2].toLowerCase())
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return parts[1].toLowerCase()
}

// "PU-031E-1069", "pu 031e 1069" or "PU031E1069" -> "PU-031E-1069"; null if it isn't one.
export function normalizePickupIdLabel(raw: string): string | null {
  const compact = raw.trim().toUpperCase().replace(/[\s-]/g, '')
  const match = /^PU([0-9A-F]{8})$/.exec(compact)
  return match ? `PU-${match[1].slice(0, 4)}-${match[1].slice(4)}` : null
}

// The authorized_pickups id whose printed label matches, among `candidateIds`.
export function findPickupIdByLabel(label: string, candidateIds: string[]): string | null {
  const wanted = normalizePickupIdLabel(label)
  if (!wanted) return null
  const matches = candidateIds.filter((id) => pickupIdLabel(id) === wanted)
  // Two people sharing a label (about 1 in 4 billion) is refused rather than guessed.
  return matches.length === 1 ? matches[0].toLowerCase() : null
}
