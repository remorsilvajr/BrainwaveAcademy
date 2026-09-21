import { describe, expect, it } from 'vitest'
import { validateCorrectionNotes, CORRECTION_NOTE_MAX } from '@/lib/documents'
import { documentCorrectionEmail } from '@/lib/notification-emails'

describe('validateCorrectionNotes', () => {
  const statuses = { birth_certificate: 'needs_correction', id_photo: 'valid', proof_of_address: 'pending', guardian_valid_id: 'needs_correction' }

  it('requires a note on every document that needs correction when asking the parent to fix things', () => {
    expect(validateCorrectionNotes(statuses, { birth_certificate: 'Too dark to read.' }, true)).toContain('Parent / Guardian Valid ID')
    expect(validateCorrectionNotes(statuses, { birth_certificate: 'Too dark to read.', guardian_valid_id: 'Expired ID.' }, true)).toBeNull()
  })

  it('names the document that is missing its note', () => {
    expect(validateCorrectionNotes({ birth_certificate: 'needs_correction' }, {}, true)).toContain('Birth Certificate')
  })

  it('rejects a note that is only whitespace or too short', () => {
    expect(validateCorrectionNotes({ id_photo: 'needs_correction' }, { id_photo: '   ' }, true)).not.toBeNull()
    expect(validateCorrectionNotes({ id_photo: 'needs_correction' }, { id_photo: 'no' }, true)).not.toBeNull()
  })

  it('does not require notes for documents that are valid or still pending', () => {
    expect(validateCorrectionNotes({ id_photo: 'valid', proof_of_address: 'pending' }, {}, true)).toBeNull()
  })

  it('a plain save allows an empty note but never one over the limit', () => {
    expect(validateCorrectionNotes({ id_photo: 'needs_correction' }, {}, false)).toBeNull()
    expect(validateCorrectionNotes({ id_photo: 'needs_correction' }, { id_photo: 'x'.repeat(CORRECTION_NOTE_MAX + 1) }, false)).toContain('characters or fewer')
    expect(validateCorrectionNotes({ id_photo: 'needs_correction' }, { id_photo: 'x'.repeat(CORRECTION_NOTE_MAX) }, false)).toBeNull()
  })
})

describe('documentCorrectionEmail', () => {
  const evil = '<script>alert(1)</script>'

  it('lists each document with its note and escapes what the admin typed', () => {
    const mail = documentCorrectionEmail({
      parentFirstName: 'Ana',
      studentName: 'Bo Lee',
      items: [
        { label: 'Birth Certificate', note: 'The photo is blurry.' },
        { label: '2×2 ID Photo', note: evil },
      ],
      siteUrl: 'https://school.test',
    })
    expect(mail.subject).toContain('Bo Lee')
    expect(mail.html).toContain('Birth Certificate')
    expect(mail.html).toContain('The photo is blurry.')
    expect(mail.html).toContain('2×2 ID Photo')
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('/parent/requirements')
  })
})
