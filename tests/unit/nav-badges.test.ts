import { describe, expect, it } from 'vitest'
import { countUnreadByNavHref, isSectionHref, requirementsToDo, sectionSeenFilter } from '@/lib/nav-badges'

describe('isSectionHref', () => {
  it('accepts a tab, rejects the portal home and anything odd', () => {
    expect(isSectionHref('/parent/album')).toBe(true)
    expect(isSectionHref('/admin/enroll-a-student')).toBe(true)
    expect(isSectionHref('/parent')).toBe(false)
    expect(isSectionHref('/parent/album/2026-09-21')).toBe(false)
    expect(isSectionHref('/other/album')).toBe(false)
    expect(isSectionHref('/parent/album,href.eq.x')).toBe(false)
    expect(isSectionHref('/parent/alb um')).toBe(false)
  })
})

describe('countUnreadByNavHref', () => {
  const navs = ['/parent/announcement', '/parent/album', '/parent/calendar', '/parent/payments', '/parent']

  it('counts a notification against the tab it points into, including deeper paths and query strings', () => {
    const counts = countUnreadByNavHref(
      ['/parent/album/2026-09-21', '/parent/album/2026-09-20', '/parent/calendar?month=2026-10', '/parent/announcement', '/parent/payments'],
      navs
    )
    expect(counts).toMatchObject({
      '/parent/album': 2,
      '/parent/calendar': 1,
      '/parent/announcement': 1,
      '/parent/payments': 1,
    })
  })

  it('never counts the portal home, and ignores notifications with no link', () => {
    const counts = countUnreadByNavHref([null, '/parent/album', '/parent'], navs)
    expect(counts['/parent']).toBeUndefined()
    expect(counts['/parent/album']).toBe(1)
  })

  it('does not confuse tabs that share a prefix', () => {
    const counts = countUnreadByNavHref(['/parent/album-extra', '/parent/albums'], ['/parent/album'])
    expect(counts['/parent/album']).toBe(0)
  })

  it('is zero when nothing is unread', () => {
    expect(countUnreadByNavHref([], navs)['/parent/album']).toBe(0)
  })
})

describe('requirementsToDo', () => {
  const app = (id: string, extra: Record<string, unknown> = {}) => ({ id, created_student_id: null, status: 'approved', ...extra })
  const doc = (application_id: string, document_type: string, verification_status = 'pending', file_url: string | null = 'x.pdf') => ({
    application_id,
    document_type,
    file_url,
    verification_status,
  })

  it('is four for a child with nothing uploaded', () => {
    expect(requirementsToDo([app('a')], [])).toBe(4)
  })

  it('goes down by one for every file uploaded', () => {
    expect(requirementsToDo([app('a')], [doc('a', 'birth_certificate')])).toBe(3)
    expect(requirementsToDo([app('a')], [doc('a', 'birth_certificate'), doc('a', 'id_photo')])).toBe(2)
  })

  it('goes up by one for every correction the admin requests, and back down when it is re-uploaded', () => {
    const all = ['birth_certificate', 'id_photo', 'proof_of_address', 'guardian_valid_id']
    const uploaded = all.map((t) => doc('a', t))
    expect(requirementsToDo([app('a')], uploaded)).toBe(0)
    const oneCorrection = all.map((t, i) => doc('a', t, i === 0 ? 'needs_correction' : 'valid'))
    expect(requirementsToDo([app('a')], oneCorrection)).toBe(1)
    const twoCorrections = all.map((t, i) => doc('a', t, i < 2 ? 'needs_correction' : 'valid'))
    expect(requirementsToDo([app('a')], twoCorrections)).toBe(2)
    // re-uploading resets a document to pending
    const reuploaded = all.map((t, i) => doc('a', t, i === 0 ? 'pending' : i === 1 ? 'needs_correction' : 'valid'))
    expect(requirementsToDo([app('a')], reuploaded)).toBe(1)
  })

  it('counts every child that is still applying, and skips rejected or already-enrolled ones', () => {
    expect(
      requirementsToDo([app('a'), app('b'), app('c', { status: 'rejected' }), app('d', { created_student_id: 's1' })], [doc('a', 'birth_certificate')])
    ).toBe(3 + 4)
  })

  it('a document row with no file still counts as missing', () => {
    expect(requirementsToDo([app('a')], [doc('a', 'birth_certificate', 'pending', null)])).toBe(4)
  })
})

describe('sectionSeenFilter', () => {
  it('matches the tab itself, anything below it and its query-string links', () => {
    expect(sectionSeenFilter('/parent/album')).toBe('href.eq./parent/album,href.like./parent/album/*,href.like./parent/album?*')
  })
})
