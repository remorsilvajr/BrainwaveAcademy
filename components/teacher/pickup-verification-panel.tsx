'use client'

import { useState } from 'react'
import { User as UserIcon, ShieldCheck, ShieldAlert } from 'lucide-react'
import { StudentSelector } from '@/components/teacher/student-selector'
import { logPickupCheck } from '@/app/teacher/pickup-verification/actions'

type Student = { id: string; first_name: string; last_name: string; classroom_id: string | null }
type Classroom = { id: string; name: string }
type Pickup = {
  id: string
  full_name: string
  relationship: string | null
  phone_number: string | null
  photoUrl: string | null
}

export function PickupVerificationPanel({
  students,
  classrooms,
  selectedId,
  studentName,
  pickups,
  basePath,
}: {
  students: Student[]
  classrooms: Classroom[]
  selectedId: string
  studentName: string
  pickups: Pickup[]
  basePath: string
}) {
  const [search, setSearch] = useState('')
  const [loggedId, setLoggedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const term = search.trim().toLowerCase()
  const matches = term ? pickups.filter((p) => p.full_name.toLowerCase().includes(term)) : []

  async function handleLog(pickup: Pickup) {
    setError('')
    try {
      const result = await logPickupCheck(selectedId, pickup.full_name)
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <StudentSelector students={students} classrooms={classrooms} selectedId={selectedId} basePath={basePath} />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Viewing <span className="font-semibold text-gray-900 dark:text-gray-100">{studentName}</span>&apos;s authorized
          pickup list
        </p>
      </div>

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

        {term && (
          <div className="mt-3 space-y-2">
            {matches.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                No match on file for &quot;{search.trim()}&quot;. Do not release the child without admin confirmation.
              </div>
            ) : (
              matches.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL
                      <img src={p.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                        <UserIcon className="h-5 w-5" />
                      </span>
                    )}
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-green-800 dark:text-green-300">
                        <ShieldCheck className="h-4 w-4" />
                        {p.full_name}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {[p.relationship, p.phone_number].filter(Boolean).join(' · ') || 'Authorized on file'}
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
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Full Authorized List</h2>
        {pickups.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No authorized pickup persons registered for this student.</p>
        ) : (
          <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {pickups.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2">
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a freshly-signed private-bucket URL
                  <img src={p.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                    <UserIcon className="h-4 w-4" />
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {[p.relationship, p.phone_number].filter(Boolean).join(' · ') || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
