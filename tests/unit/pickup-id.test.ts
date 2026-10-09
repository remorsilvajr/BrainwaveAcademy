import { beforeAll, describe, expect, it, vi } from 'vitest'
import { findPickupIdByLabel, normalizePickupIdLabel, parsePickupIdCode, pickupIdCode, pickupIdLabel } from '@/lib/pickup-id'

const ID = '3f2b8c1e-5d4a-4f6b-9a7c-1e2d3c4b5a69'

beforeAll(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
})

describe('pickup ID codes', () => {
  it('round-trips a signed code back to the pickup id', () => {
    expect(parsePickupIdCode(pickupIdCode(ID))).toBe(ID)
    expect(parsePickupIdCode(`  ${pickupIdCode(ID)}\n`)).toBe(ID) // a scanner may add whitespace
  })
  it('rejects a forged, tampered or malformed code', () => {
    const good = pickupIdCode(ID)
    const other = pickupIdCode('11111111-2222-4333-8444-555555555555')
    expect(parsePickupIdCode(`BWPID1.${ID}.${'0'.repeat(20)}`)).toBeNull() // made-up signature
    expect(parsePickupIdCode(other.replace('11111111-2222-4333-8444-555555555555', ID))).toBeNull() // signature of another id
    expect(parsePickupIdCode(good.slice(0, -1))).toBeNull()
    expect(parsePickupIdCode(good + 'x')).toBeNull()
    for (const bad of ['', 'hello', 'BWPID1.not-a-uuid.abc', `BWPID2.${ID}.abc`, `${good}.extra`]) expect(parsePickupIdCode(bad)).toBeNull()
  })
  it('a different secret does not verify', () => {
    const good = pickupIdCode(ID)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'another-key')
    expect(parsePickupIdCode(good)).toBeNull()
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  })
  it('has a short readable label', () => {
    expect(pickupIdLabel(ID)).toMatch(/^PU-[0-9A-F]{4}-[0-9A-F]{4}$/)
  })
})

describe('pickup ID label typed by hand', () => {
  const other = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
  it('normalizes the ways people type it', () => {
    expect(normalizePickupIdLabel('PU-031E-1069')).toBe('PU-031E-1069')
    expect(normalizePickupIdLabel(' pu 031e 1069 ')).toBe('PU-031E-1069')
    expect(normalizePickupIdLabel('PU031E1069')).toBe('PU-031E-1069')
    expect(normalizePickupIdLabel('PU-031E-106')).toBeNull()
    expect(normalizePickupIdLabel('BWPID1.x.y')).toBeNull()
  })
  it('finds the person whose card carries that label, and nobody else', () => {
    const label = pickupIdLabel(ID)
    expect(findPickupIdByLabel(label, [other, ID])).toBe(ID)
    expect(findPickupIdByLabel(label.toLowerCase().replace(/-/g, ' '), [other, ID])).toBe(ID)
    expect(findPickupIdByLabel(label, [other])).toBeNull()
    expect(findPickupIdByLabel('PU-0000-0000', [other, ID])).toBeNull()
  })
})
