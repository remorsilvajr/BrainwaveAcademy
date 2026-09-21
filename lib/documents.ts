export const documentLabels: Record<string, string> = {
  birth_certificate: 'Birth Certificate - PSA/NSO copy',
  id_photo: '2x2 ID Photo - Recent',
  proof_of_address: 'Proof of Address - Barangay/Utility',
  guardian_valid_id: 'Parent / Guardian Valid ID',
}

export const documentShortLabels: Record<string, string> = {
  birth_certificate: 'Birth Certificate',
  id_photo: '2×2 ID Photo',
  proof_of_address: 'Proof of Address',
  guardian_valid_id: 'Parent / Guardian Valid ID',
}

export const documentDescriptions: Record<string, string> = {
  birth_certificate: 'PSA/NSO copy in clear scanned format',
  id_photo: 'Recent photo of the student',
  proof_of_address: "Barangay clearance or recent utility bill under guardian's name",
  guardian_valid_id: 'Government-issued identification card (e.g. Passport, Driver\'s License)',
}

export const documentOrder = Object.keys(documentLabels)

export const CORRECTION_NOTE_MIN = 5
export const CORRECTION_NOTE_MAX = 500

// The note an admin writes for each document marked "needs correction": what is wrong with
// it, so the parent knows what to upload instead. `requireAll` (asking the parent to fix
// things) means every such document needs one; a plain save only checks the length.
// Returns a sentence for the admin, or null when fine.
export function validateCorrectionNotes(
  statuses: Record<string, string>,
  notes: Record<string, string>,
  requireAll: boolean
): string | null {
  for (const type of documentOrder) {
    if (statuses[type] !== 'needs_correction') continue
    const note = (notes[type] ?? '').trim()
    const label = documentShortLabels[type] ?? type
    if (note.length > CORRECTION_NOTE_MAX) return `The note for ${label} must be ${CORRECTION_NOTE_MAX} characters or fewer.`
    if (requireAll && note.length < CORRECTION_NOTE_MIN) return `Tell the parent what to fix in the ${label} (at least ${CORRECTION_NOTE_MIN} characters).`
  }
  return null
}
