'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { recordTeacherAttendance } from '@/app/admin/attendance/actions'
import { todayIso } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { DateSelector } from '@/components/teacher/date-selector'

type Teacher = { id: string; first_name: string; last_name: string; subtitle: string }

const statusMeta: Record<string, string> = {
  present: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
  absent: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  late: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
}

// The admin's roster: one row per teacher with Present / Late / Absent for the chosen date.
// Same look as the teachers' student check-in (components/teacher/roster-checkin.tsx), for
// people instead of children.
export function TeacherAttendanceRoster({
  teachers,
  statusByTeacher,
  date,
  basePath,
}: {
  teachers: Teacher[]
  statusByTeacher: Record<string, string>
  date: string
  basePath: string
}) {
  const router = useRouter()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')

  const filtered = teachers.filter((t) => !search.trim() || `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()))
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)

  // Clears the "Saved" confirmation a couple of seconds after it appears.
  useEffect(() => {
    if (!savedId) return
    const timeout = setTimeout(() => setSavedId(null), 2000)
    return () => clearTimeout(timeout)
  }, [savedId])

  async function handleMark(teacherId: string, status: string) {
    setMarkingId(teacherId)
    setSavedId(null)
    setErrorMessage('')
    try {
      const result = await recordTeacherAttendance({ teacher_id: teacherId, date, status })
      if (result?.error) {
        setErrorMessage(result.error)
        return
      }
      setSavedId(teacherId)
      // Let the "Saved" confirmation paint before fresh server data replaces it.
      setTimeout(() => router.refresh(), 400)
    } catch {
      setErrorMessage('Something went wrong.')
    } finally {
      setMarkingId(null)
    }
  }

  const isToday = date === todayIso()
  const marked = teachers.filter((t) => statusByTeacher[t.id]).length

  return (
    <div id="roster" className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{isToday ? "Today's Teacher Check-In" : 'Teacher Attendance'}</h2>
        <DateSelector date={date} basePath={basePath} />
      </div>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        {marked} of {teachers.length} teacher{teachers.length === 1 ? '' : 's'} marked for this date.
      </p>

      {errorMessage && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

      <div className="mt-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teachers…"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0b1b62] focus:outline-none dark:border-gray-700 dark:focus:border-indigo-400"
        />
      </div>

      <div className="mt-2 min-h-[320px] divide-y divide-gray-100 dark:divide-gray-800">
        {pageItems.map((t) => {
          const status = statusByTeacher[t.id]
          return (
            <div key={t.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 sm:flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t.first_name} {t.last_name}
                </p>
                {t.subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{t.subtitle}</p>}
              </div>
              {/* One row of buttons at every width from sm up, so a long label beside them can't
                  push "Absent" onto its own line (it wraps in its own column instead). */}
              <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:flex-nowrap">
                {['present', 'late', 'absent'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={markingId === t.id}
                    onClick={() => handleMark(t.id, option)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize disabled:opacity-60 ${
                      status === option
                        ? statusMeta[option]
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
                {savedId === t.id && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {pageItems.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {teachers.length === 0 ? 'No teacher accounts yet.' : 'No teachers match your search.'}
          </p>
        )}
      </div>

      <div className="-mx-4 -mb-4 mt-2">
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  )
}
