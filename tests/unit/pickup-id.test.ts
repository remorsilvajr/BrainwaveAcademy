import { beforeAll, describe, expect, it, vi } from 'vitest'
import { parsePickupIdCode, pickupIdCode, pickupIdLabel } from '@/lib/pickup-id'

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
