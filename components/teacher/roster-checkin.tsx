'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { recordAttendance } from '@/app/teacher/student-dashboard/actions'
import { formatDateLong, todayIso } from '@/lib/format'

type Student = { id: string; first_name: string; last_name: string }

const statusMeta: Record<string, string> = {
  present: 'text-green-600 bg-green-50',
  absent: 'text-red-600 bg-red-50',
  late: 'text-amber-600 bg-amber-50',
}

export function RosterCheckin({
  students,
  statusByStudent,
  date,
  readOnly = false,
}: {
  students: Student[]
  statusByStudent: Record<string, string>
  date: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

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
    <div id="roster" className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {isToday ? "Today's Roster Check-In" : 'Roster Attendance'}
        </h2>
        <span className="text-sm text-gray-500">{formatDateLong(date)}</span>
      </div>
      {readOnly && (
        <p className="mt-1 text-xs text-gray-400">
          Viewing a past date — attendance can only be changed by an admin.
        </p>
      )}

      {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}

      <div className="mt-4 divide-y divide-gray-100">
        {students.map((s) => {
          const status = statusByStudent[s.id]
          return (
            <div key={s.id} className="flex items-center justify-between gap-4 py-3">
              <p className="text-sm font-medium text-gray-900">
                {s.first_name} {s.last_name}
              </p>
              {readOnly ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    status ? statusMeta[status] : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {status ?? 'Not marked'}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  {savedId === s.id && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  {['present', 'late', 'absent'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={markingId === s.id}
                      onClick={() => handleMark(s.id, option)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize disabled:opacity-60 ${
                        status === option
                          ? statusMeta[option]
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {students.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No students on file yet.</p>}
      </div>
    </div>
  )
}
