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
