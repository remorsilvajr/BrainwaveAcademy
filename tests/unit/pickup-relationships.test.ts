import { describe, expect, it } from 'vitest'
import { composeOtherRelationship, isAllowedPickupRelationship, parseRelationship, relationshipGroup } from '@/lib/pickup-relationships'

describe('pickup relationship "Other"', () => {
  it('must be specified', () => {
    expect(isAllowedPickupRelationship('Other')).toBe(false)
    expect(isAllowedPickupRelationship('Other (Neighbor)')).toBe(true)
    expect(isAllowedPickupRelationship('Other (x)')).toBe(false)
    expect(isAllowedPickupRelationship('Other (<script>)')).toBe(false)
    expect(isAllowedPickupRelationship(`Other (${'a'.repeat(41)})`)).toBe(false)
    expect(isAllowedPickupRelationship('Grandmother')).toBe(true)
    expect(isAllowedPickupRelationship('Lola')).toBe(false)
  })
  it('round-trips and groups under Other', () => {
    const stored = composeOtherRelationship('  family   neighbor ')
    expect(stored).toBe('Other (family neighbor)')
    expect(parseRelationship(stored)).toEqual({ choice: 'Other', other: 'family neighbor' })
    expect(parseRelationship('Aunt')).toEqual({ choice: 'Aunt', other: '' })
    expect(relationshipGroup('Other (Neighbor)')).toBe('Other')
    expect(relationshipGroup(null)).toBeNull()
  })
})
