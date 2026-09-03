'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { recordAttendance } from '@/app/teacher/student-dashboard/actions'
import { todayIso } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { DateSelector } from '@/components/teacher/date-selector'

type Student = { id: string; first_name: string; last_name: string }

const statusMeta: Record<string, string> = {
  present: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
  absent: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  late: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
}

export function RosterCheckin({
  students,
  statusByStudent,
  date,
  basePath,
  readOnly = false,
}: {
  students: Student[]
  statusByStudent: Record<string, string>
  date: string
  basePath: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(term)
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)

  // Clears the "Saved" confirmation a couple seconds after it appears,
  // rather than leaving it up until the next action.
  useEffect(() => {
    if (!savedId) return
    const timeout = setTimeout(() => setSavedId(null), 2000)
    return () => clearTimeout(timeout)
  }, [savedId])

  async function handleMark(studentId: string, status: string) {
    setMarkingId(studentId)
    setSavedId(null)
    setErrorMessage('')
    try {
      await recordAttendance({ student_id: studentId, date, status })
      setSavedId(studentId)
      // Give the "Saved" confirmation a moment to actually paint before
      // router.refresh() swaps in fresh server data — calling refresh() in
      // the same tick as the state update above raced it out, so the
      // confirmation never had a visible frame.
      setTimeout(() => router.refresh(), 400)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setMarkingId(null)
    }
  }

  const isToday = date === todayIso()

  return (
    <div id="roster" className="mx-auto max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {isToday ? "Today's Roster Check-In" : 'Roster Attendance'}
        </h2>
        <DateSelector date={date} basePath={basePath} />
      </div>
      {readOnly && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Viewing a past date — attendance can only be changed by an admin.
        </p>
      )}

      {errorMessage && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

      <div className="mt-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-2 min-h-[320px] divide-y divide-gray-100 dark:divide-gray-800">
        {pageItems.map((s) => {
          const status = statusByStudent[s.id]
          return (
            <div key={s.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {s.first_name} {s.last_name}
              </p>
              {readOnly ? (
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    status ? statusMeta[status] : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {status ?? 'Not marked'}
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {['present', 'late', 'absent'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={markingId === s.id}
                      onClick={() => handleMark(s.id, option)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize disabled:opacity-60 ${
                        status === option
                          ? statusMeta[option]
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                  {savedId === s.id && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {pageItems.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {students.length === 0 ? 'No students on file yet.' : 'No students match your search.'}
          </p>
        )}
      </div>

      <div className="-mx-4 -mb-4 mt-2">
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
