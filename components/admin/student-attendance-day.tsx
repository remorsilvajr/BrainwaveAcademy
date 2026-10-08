'use client'

import { useState } from 'react'
import Link from 'next/link'

export type DayClass = {
  id: string
  name: string
  students: { id: string; name: string; status: 'present' | 'late' | 'absent' | null; allergy: string | null }[]
}

const statusStyles: Record<string, string> = {
  present: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  late: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  absent: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

// One day's student attendance for the admin, read-only (teachers record it).
// A class filter narrows it to one class; each class shows its counts and who
// has not been marked yet.
export function StudentAttendanceDay({ classes, isToday }: { classes: DayClass[]; isToday: boolean }) {
  const [classFilter, setClassFilter] = useState('all')
  const shown = classFilter === 'all' ? classes : classes.filter((c) => c.id === classFilter)
  const all = shown.flatMap((c) => c.students)
  const count = (s: DayClass['students'][number]['status']) => all.filter((x) => x.status === s).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="attendance-class" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Class
          </label>
          <select
            id="attendance-class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100"
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 font-medium ${statusStyles.present}`}>{count('present')} present</span>
          <span className={`rounded-full px-3 py-1 font-medium ${statusStyles.late}`}>{count('late')} late</span>
          <span className={`rounded-full px-3 py-1 font-medium ${statusStyles.absent}`}>{count('absent')} absent</span>
          <span className={`rounded-full px-3 py-1 font-medium ${statusStyles.none}`}>
            {count(null)} {isToday ? 'not marked yet' : 'not marked'}
          </span>
        </div>
      </div>

      {shown.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No classes with daily attendance.</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shown.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#0b1b62] dark:text-indigo-300">{c.name}</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {c.students.filter((s) => s.status === 'present' || s.status === 'late').length} of {c.students.length} in
              </span>
            </div>
            {c.students.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">No students in this class.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                {c.students.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/student-dashboard?student=${s.id}&class=${c.id}`}
                        className="text-sm font-medium text-gray-900 hover:underline dark:text-gray-100"
                      >
                        {s.name}
                      </Link>
                      {s.allergy && (
                        <p className="mt-0.5 inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                          Allergy: {s.allergy}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[s.status ?? 'none']}`}>
                      {s.status ?? 'Not marked'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
