'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { isAgeEligibleForClassroom, classroomAgeRangeLabel } from '@/lib/classrooms'
import { formatCurrency } from '@/lib/format'
import { programOptionConfig, PROGRAM_BRANCH_NOTE } from '@/lib/program-options'
import { ProgramOptionsPicker } from '@/components/enroll/program-options-picker'

export type SelectableClassroom = {
  id: string
  name: string
  slug: string
  min_age_years: number | null
  max_age_years: number | null
  tuition_fee: number
  activity_fee: number
}

// Shared by both enroll wizards (public /enroll and /parent/enroll-a-student).
// A card grid, not a native <select> — matches this app's existing
// pill/card-selection convention (e.g. the document Valid/Needs Correction
// toggles) rather than introducing a new interaction pattern for a "pick
// one" choice with only a handful of options.
export function ProgramSelector({
  classrooms,
  studentDob,
  value,
  onChange,
  error,
  optionsError,
  onOptionsChange,
}: {
  classrooms: SelectableClassroom[]
  studentDob: string
  value: string
  onChange: (classroomId: string) => void
  error?: string
  optionsError?: string
  // Lets the parent form clear a stale "choose at least one" error as soon as
  // the visitor ticks a box.
  onOptionsChange?: () => void
}) {
  // Eligibility can only be judged once a DOB exists — with nothing entered
  // yet, no card is disabled. Resetting the selection when a DOB edit makes
  // it ineligible is the caller's job, not this component's: this component
  // only owns local UI state, and calling the `onChange` prop (which sets
  // state in a *different* component) during this component's own render is
  // exactly the "setState while rendering a different component" React
  // warns about, not the legal "adjust my own state" pattern.
  const selectedClassroom = classrooms.find((c) => c.id === value)

  return (
    <div>
      <input type="hidden" name="requested_classroom_id" value={value} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => {
          const eligible = !studentDob || isAgeEligibleForClassroom(studentDob, classroom)
          const selected = value === classroom.id

          return (
            <button
              key={classroom.id}
              type="button"
              disabled={!eligible}
              onClick={() => onChange(classroom.id)}
              title={!eligible ? `Not available for this student's age (${classroomAgeRangeLabel(classroom)})` : undefined}
              className={`relative rounded-xl border p-4 text-left transition ${
                !eligible
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50 dark:border-slate-700 dark:bg-gray-800/40'
                  : selected
                    ? 'border-[#0b1b62] bg-[#0b1b62]/5 dark:border-indigo-400 dark:bg-indigo-400/10'
                    : 'border-slate-200 hover:border-[#0b1b62]/40 dark:border-slate-700 dark:hover:border-indigo-400/40'
              }`}
            >
              {selected && eligible && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1b62] text-white dark:bg-indigo-400 dark:text-indigo-950">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <p className="pr-6 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">{classroom.name}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {classroomAgeRangeLabel(classroom)}
              </p>
              {eligible && programOptionConfig(classroom.slug) ? (
                <div className="mt-3 space-y-0.5 text-xs text-gray-700 dark:text-gray-300">
                  <p className="font-semibold">{formatCurrency(programOptionConfig(classroom.slug)!.hourlyRate)} per hour</p>
                  <p className="text-gray-500 dark:text-gray-400">{programOptionConfig(classroom.slug)!.options.length} options to choose from</p>
                  <p className="text-gray-500 dark:text-gray-400">{PROGRAM_BRANCH_NOTE}</p>
                </div>
              ) : eligible ? (
                <div className="mt-3 space-y-0.5 text-xs text-gray-700 dark:text-gray-300">
                  {classroom.tuition_fee > 0 && (
                    <p>Tuition: {formatCurrency(classroom.tuition_fee)}</p>
                  )}
                  {classroom.activity_fee > 0 && (
                    <p>Activity Fee: {formatCurrency(classroom.activity_fee)}</p>
                  )}
                  {classroom.tuition_fee <= 0 && classroom.activity_fee <= 0 && (
                    <p className="text-gray-400 dark:text-gray-500">No fee set</p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Not available for this age
                </p>
              )}
            </button>
          )
        })}
      </div>
      {selectedClassroom && programOptionConfig(selectedClassroom.slug) ? (
        <div className="mt-4">
          {/* key: choosing a different program starts a fresh, empty selection. */}
          <EnrollmentOptions key={selectedClassroom.id} slug={selectedClassroom.slug} error={optionsError} onChange={onOptionsChange} />
        </div>
      ) : (
        selectedClassroom && (
          <p className="mt-3 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
            Total: {formatCurrency(selectedClassroom.tuition_fee + selectedClassroom.activity_fee)}
          </p>
        )
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

// The wizard's checkboxes post as `requested_program_options` (one value per
// checked box). State lives here, remounted per program via `key` above.
function EnrollmentOptions({ slug, error, onChange }: { slug: string; error?: string; onChange?: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <ProgramOptionsPicker
      slug={slug}
      selected={selected}
      onChange={(next) => {
        setSelected(next)
        onChange?.()
      }}
      name="requested_program_options"
      error={error}
    />
  )
}
