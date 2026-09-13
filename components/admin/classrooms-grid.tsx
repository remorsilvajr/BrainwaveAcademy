'use client'

import { useState } from 'react'
import { Users, GraduationCap } from 'lucide-react'
import { classroomAgeRangeLabel } from '@/lib/classrooms'
import { formatCurrency } from '@/lib/format'
import { ClassroomModal } from '@/components/admin/classroom-modal'
import type { SearchableOption } from '@/components/ui/searchable-select'

export type ClassroomRow = {
  id: string
  name: string
  min_age_years: number | null
  max_age_years: number | null
  lead_teacher_id: string | null
  leadTeacherName: string | null
  tuition_fee: number
  activity_fee: number
  tuition_due_date: string | null
  activity_due_date: string | null
  assistants: { id: string; name: string }[]
  roster: { id: string; first_name: string; last_name: string; student_id: string | null; avatar_url: string | null; date_of_birth: string }[]
}

// Six fixed classrooms, one per program — no search/pagination scaffolding
// here on purpose (see the Search + pagination convention in CLAUDE.md):
// that pattern exists for lists that can grow past a page, and this one
// never will, since classrooms are seeded once and aren't admin-creatable.
export function ClassroomsGrid({
  classrooms,
  teacherOptions,
}: {
  classrooms: ClassroomRow[]
  teacherOptions: SearchableOption[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (classrooms.find((c) => c.id === selectedId) ?? null) : null

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-left hover:border-[#0b1b62] dark:hover:border-indigo-400"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{c.name}</h2>
              <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                {classroomAgeRangeLabel(c)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <GraduationCap className="h-4 w-4 shrink-0" />
              {c.leadTeacherName ? (
                <span>{c.leadTeacherName} (Lead)</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">No lead teacher assigned</span>
              )}
            </div>
            {c.assistants.length > 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                +{c.assistants.length} assistant{c.assistants.length === 1 ? '' : 's'}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4 shrink-0" />
              {c.roster.length} student{c.roster.length === 1 ? '' : 's'} enrolled
            </div>

            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3 text-xs text-gray-500 dark:text-gray-400">
              Tuition {formatCurrency(c.tuition_fee)} · Activity {formatCurrency(c.activity_fee)}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <ClassroomModal classroom={selected} teacherOptions={teacherOptions} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
