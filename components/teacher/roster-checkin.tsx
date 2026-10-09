'use client'

import { useEffect, useState } from 'react'
import type { HealthAlert } from '@/lib/health'
import { HealthAlertChips } from '@/components/health/health-alert-chips'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { recordAttendance, recordAttendanceTimes } from '@/app/teacher/student-dashboard/actions'
import { formatTime12, manilaTimeNow, toHHMM } from '@/lib/attendance-times'
import { todayIso } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { DateSelector } from '@/components/teacher/date-selector'

type Student = { id: string; first_name: string; last_name: string; classroom_id: string | null }
type Classroom = { id: string; name: string }

const statusMeta: Record<string, string> = {
  present: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
  absent: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  late: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
}

export function RosterCheckin({
  students,
  classrooms,
  statusByStudent,
  date,
  basePath,
  readOnly = false,
  alerts = {},
  timesByStudent = {},
  showUnassigned = true,
  emptyMessage,
}: {
  // studentId -> today's (or the viewed day's) arrival / departure, "HH:MM:SS" from the database.
  timesByStudent?: Record<string, { arrival: string | null; departure: string | null }>
  // The teacher's roster only holds their own classes, so no "Unassigned" option.
  showUnassigned?: boolean
  emptyMessage?: string
  // studentId -> allergy / medical flags shown beside their name (lib/health.ts).
  alerts?: Record<string, HealthAlert[]>
  students: Student[]
  // Classroom assignment is an org/billing structure, not an access
  // boundary (see the Classrooms note in CLAUDE.md) — this filter is a
  // convenience for a roster that can span every enrolled student, not a
  // restriction on which students a teacher/admin can see or mark.
  classrooms: Classroom[]
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
  const [classroomFilter, setClassroomFilter] = useState('all')

  const classroomById = new Map(classrooms.map((c) => [c.id, c.name]))

  const filtered = students.filter((s) => {
    if (classroomFilter === 'unassigned' && s.classroom_id) return false
    if (classroomFilter !== 'all' && classroomFilter !== 'unassigned' && s.classroom_id !== classroomFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(term)
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    filtered,
    `${search}|${classroomFilter}`
  )

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
      const result = await recordAttendance({ student_id: studentId, date, status })
      if (result?.error) {
        setErrorMessage(result.error)
        return
      }
      setSavedId(studentId)
      // Give the "Saved" confirmation a moment to actually paint before
      // router.refresh() swaps in fresh server data — calling refresh() in
      // the same tick as the state update above raced it out, so the
      // confirmation never had a visible frame.
      setTimeout(() => router.refresh(), 400)
    } catch {
      setErrorMessage('Something went wrong.')
    } finally {
      setMarkingId(null)
    }
  }

  const isToday = date === todayIso()

  return (
    <div id="roster" className="mx-auto max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {isToday ? "Today's Student Check-In" : 'Student Attendance'}
        </h2>
        <DateSelector date={date} basePath={basePath} />
      </div>
      {readOnly && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Viewing a past date. Student attendance can only be recorded for today.
        </p>
      )}

      {errorMessage && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          className="w-full flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
        <select
          value={classroomFilter}
          onChange={(e) => setClassroomFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-1.5 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none sm:w-52"
        >
          <option value="all">All Classrooms</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {showUnassigned && <option value="unassigned">Unassigned</option>}
        </select>
      </div>

      <div className="mt-2 min-h-[320px] divide-y divide-gray-100 dark:divide-gray-800">
        {pageItems.map((s) => {
          const status = statusByStudent[s.id]
          const times = timesByStudent[s.id]
          const attended = status === 'present' || status === 'late'
          return (
            <div key={s.id} className="py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100 sm:flex-1">
                {s.first_name} {s.last_name}
                {alerts[s.id] && <HealthAlertChips alerts={alerts[s.id]} className="ml-2 align-middle" />}
                {classroomFilter === 'all' && (
                  <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                    {s.classroom_id ? (classroomById.get(s.classroom_id) ?? '') : 'Unassigned'}
                  </span>
                )}
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
                <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:flex-nowrap">
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
            {attended &&
              (readOnly ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Arrived {formatTime12(times?.arrival)} · Left {formatTime12(times?.departure)}
                </p>
              ) : (
                <ArrivalDeparture key={`${s.id}-${times?.arrival ?? ''}-${times?.departure ?? ''}`} studentId={s.id} arrival={times?.arrival ?? null} departure={times?.departure ?? null} />
              ))}
            </div>
          )
        })}
        {pageItems.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {students.length === 0 ? (emptyMessage ?? 'No students on file yet.') : 'No students match your search.'}
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

// Today's arrival and departure for one child: editable times (saved when a field
// is left) and a "Now" button for the departure.
function ArrivalDeparture({ studentId, arrival, departure }: { studentId: string; arrival: string | null; departure: string | null }) {
  const router = useRouter()
  const [arrivalValue, setArrivalValue] = useState(toHHMM(arrival) ?? '')
  const [departureValue, setDepartureValue] = useState(toHHMM(departure) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(nextArrival: string, nextDeparture: string) {
    if (nextArrival === (toHHMM(arrival) ?? '') && nextDeparture === (toHHMM(departure) ?? '')) return
    setSaving(true)
    setError('')
    try {
      const result = await recordAttendanceTimes({ student_id: studentId, arrival_time: nextArrival || null, departure_time: nextDeparture || null })
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const timeInput =
    'rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-[#0b1b62] focus:outline-none disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400'

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
        <label className="flex items-center gap-1.5">
          Arrived
          <input
            type="time"
            value={arrivalValue}
            disabled={saving}
            onChange={(e) => setArrivalValue(e.target.value)}
            onBlur={() => save(arrivalValue, departureValue)}
            className={timeInput}
          />
        </label>
        <label className="flex items-center gap-1.5">
          Left
          <input
            type="time"
            value={departureValue}
            disabled={saving}
            onChange={(e) => setDepartureValue(e.target.value)}
            onBlur={() => save(arrivalValue, departureValue)}
            className={timeInput}
          />
        </label>
        {!departureValue && (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              const now = manilaTimeNow()
              setDepartureValue(now)
              void save(arrivalValue, now)
            }}
            className="rounded-full border border-gray-300 px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Left Now
          </button>
        )}
        {saving && <span>Saving...</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
