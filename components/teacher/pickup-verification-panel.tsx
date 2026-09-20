'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { logPickupCheck } from '@/app/teacher/pickup-verification/actions'
import { PickupAvatar } from '@/components/pickup/pickup-avatar'
import { PICKUP_RELATIONSHIPS } from '@/lib/pickup-relationships'

type Student = { id: string; first_name: string; last_name: string }
type Pickup = {
  id: string
  student_id: string
  full_name: string
  relationship: string | null
  phone_number: string | null
  photoUrl: string | null
}

const NO_RELATIONSHIP = '__none__'

// Free-text relationships ("Grandmother", "grandmother ") should collapse into
// one filter option, so compare on a trimmed, lowercased key.
function relationshipKey(relationship: string | null) {
  const key = relationship?.trim().toLowerCase()
  return key ? key : NO_RELATIONSHIP
}

// Lowercased, accent-stripped, punctuation-free words, so "Nuñez" / "Nunez" and
// "Cruz," / "cruz" compare equal.
function nameWords(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// Always school-wide: every registered pickup person is searched and listed at
// once, each labeled with the child they're authorized for (authorization is
// per child, not per person, so "is this person on file" alone isn't enough).
export function PickupVerificationPanel({ students, pickups }: { students: Student[]; pickups: Pickup[] }) {
  const [search, setSearch] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState('all')
  const [loggedId, setLoggedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const studentNameById = new Map(students.map((s) => [s.id, `${s.first_name} ${s.last_name}`]))

  // Green "Authorized" is only for a full-name match: at least two typed words,
  // each one a whole word of the registered name (a middle name may be left
  // out). Anything looser, like a fragment "an" inside "Diane", is only a
  // "similar name" prompt to confirm, never a green go-ahead.
  const searchWords = nameWords(search)
  const matches = searchWords.length >= 2
    ? pickups.filter((p) => {
        const words = nameWords(p.full_name)
        return searchWords.every((w) => words.includes(w))
      })
    : []
  const matchIds = new Set(matches.map((p) => p.id))
  const similar =
    searchWords.length > 0
      ? pickups.filter((p) => !matchIds.has(p.id) && nameWords(p.full_name).join(' ').includes(searchWords.join(' ')))
      : []

  // Every relationship a parent can pick is always offered, so staff can see
  // the full set of choices even when nobody has been registered under one yet.
  // Any legacy free-text value already on file (from before relationship became
  // a fixed dropdown) is appended so those rows stay filterable too.
  const relationshipOptions = (() => {
    const byKey = new Map<string, string>()
    for (const r of PICKUP_RELATIONSHIPS) byKey.set(relationshipKey(r), r)
    for (const p of pickups) {
      const key = relationshipKey(p.relationship)
      if (key !== NO_RELATIONSHIP && !byKey.has(key)) byKey.set(key, p.relationship!.trim())
    }
    const options = [...byKey.entries()].map(([value, label]) => ({ value, label }))
    if (pickups.some((p) => relationshipKey(p.relationship) === NO_RELATIONSHIP)) {
      options.push({ value: NO_RELATIONSHIP, label: 'Not specified' })
    }
    return options
  })()

  // A legacy value's option disappears once its last row is edited or removed;
  // treat a filter pointing at it as "all" rather than an unlisted selection.
  const activeFilter = relationshipOptions.some((o) => o.value === relationshipFilter) ? relationshipFilter : 'all'

  const listed = activeFilter === 'all' ? pickups : pickups.filter((p) => relationshipKey(p.relationship) === activeFilter)

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(listed, activeFilter)

  async function handleLog(pickup: Pickup) {
    setError('')
    try {
      const result = await logPickupCheck(pickup.student_id, pickup.full_name)
      if (result?.error) {
        setError(result.error)
        return
      }
      setLoggedId(pickup.id)
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Type the name of the person picking up
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {searchWords.length > 0 && (
          <div className="mt-3 space-y-2">
            {matches.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                No full-name match on file for &quot;{search.trim()}&quot; for any student. Do not release the child without
                admin confirmation.
              </div>
            ) : (
              matches.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <PickupAvatar
                      url={p.photoUrl}
                      sizeClassName="h-12 w-12"
                      iconClassName="h-5 w-5"
                      fallbackClassName="bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                    />
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-green-800 dark:text-green-300">
                        <ShieldCheck className="h-4 w-4" />
                        {p.full_name}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {[p.relationship, p.phone_number].filter(Boolean).join(' · ') || 'Authorized on file'}
                      </p>
                      <p className="text-xs font-semibold text-green-800 dark:text-green-300">
                        Authorized for {studentNameById.get(p.student_id) ?? 'an unknown student'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLog(p)}
                    disabled={loggedId === p.id}
                    className="shrink-0 rounded-full border border-green-600 dark:border-green-500 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loggedId === p.id ? 'Logged' : 'Log Check'}
                  </button>
                </div>
              ))
            )}
            {similar.length > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
                  <ShieldQuestion className="h-4 w-4 shrink-0" />
                  Similar names on file. Ask for the person&apos;s full name before treating this as a match.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                  {similar.map((p) => (
                    <li key={p.id}>
                      {p.full_name} (for {studentNameById.get(p.student_id) ?? 'an unknown student'})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">All Authorized Pickup Persons</h2>
          {pickups.length > 0 && (
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Relationship</label>
              <select
                value={activeFilter}
                onChange={(e) => setRelationshipFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              >
                <option value="all">All relationships</option>
                {relationshipOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {pickups.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No authorized pickup persons have been registered yet.
          </p>
        ) : (
          <>
            <div className="mt-2 min-h-[360px] divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2">
                  <PickupAvatar
                    url={p.photoUrl}
                    sizeClassName="h-9 w-9"
                    iconClassName="h-4 w-4"
                    fallbackClassName="bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {[p.relationship, p.phone_number].filter(Boolean).join(' · ') || '-'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      For {studentNameById.get(p.student_id) ?? 'an unknown student'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  )
}
