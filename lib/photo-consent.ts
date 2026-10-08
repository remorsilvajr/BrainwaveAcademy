// Whether a child may appear in the regular class photos in the Photo Album
// (other parents of the class can see those). Stored on students.photo_consent
// (and applications.photo_consent until approval copies it over):
// true = allowed, false = not allowed, null = the parent hasn't answered yet,
// which the school treats the same as not allowed.

export const PHOTO_CONSENT_REQUIRED_MESSAGE = 'Please choose whether your child may appear in class photos.'

// The form value ('yes'/'no') as stored; anything else is "not answered".
export function parsePhotoConsent(raw: unknown): boolean | null {
  if (raw === 'yes') return true
  if (raw === 'no') return false
  return null
}

export function photoConsentLabel(consent: boolean | null | undefined): string {
  if (consent === true) return 'Allowed in class photos'
  if (consent === false) return 'Not allowed in class photos'
  return 'Not answered yet (treated as not allowed)'
}

// Only an explicit yes lets a child appear in class photos.
export function mayAppearInClassPhotos(consent: boolean | null | undefined): boolean {
  return consent === true
}
