import { describe, expect, it } from 'vitest'
import { mayAppearInClassPhotos, parsePhotoConsent, photoConsentLabel } from '@/lib/photo-consent'

describe('class photo consent', () => {
  it('only an explicit yes allows a child in class photos', () => {
    expect(mayAppearInClassPhotos(true)).toBe(true)
    expect(mayAppearInClassPhotos(false)).toBe(false)
    expect(mayAppearInClassPhotos(null)).toBe(false)
    expect(mayAppearInClassPhotos(undefined)).toBe(false)
  })
  it('reads the form value strictly', () => {
    expect(parsePhotoConsent('yes')).toBe(true)
    expect(parsePhotoConsent('no')).toBe(false)
    expect(parsePhotoConsent('')).toBeNull()
    expect(parsePhotoConsent('true')).toBeNull()
    expect(parsePhotoConsent(null)).toBeNull()
  })
  it('labels say an unanswered child is treated as not allowed', () => {
    expect(photoConsentLabel(null)).toContain('treated as not allowed')
    expect(photoConsentLabel(true)).toBe('Allowed in class photos')
  })
})
