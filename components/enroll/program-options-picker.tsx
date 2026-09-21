'use client'

import { formatCurrency } from '@/lib/format'
import { PROGRAM_BRANCH_NOTE, programOptionConfig } from '@/lib/program-options'

// Checkboxes for the named options inside a Tutorial / Quiz Bee style program
// (a subject, or a competition). Controlled by the caller so the same picker
// serves the enrollment wizards, the admin application review and the Student
// Record. Renders nothing for a program with no options. `name` makes each
// checked box post as one value of that field, for the plain <form> wizards.
export function ProgramOptionsPicker({
  slug,
  selected,
  onChange,
  name,
  disabled,
  error,
}: {
  slug: string | null | undefined
  selected: string[]
  onChange: (next: string[]) => void
  name?: string
  disabled?: boolean
  error?: string
}) {
  const config = programOptionConfig(slug)
  if (!config) return null

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option])
  }

  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
      <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        Choose the {config.optionsLabel} <span className="text-red-500">*</span>
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        Select all that apply. Billed at {formatCurrency(config.hourlyRate)} per hour. {PROGRAM_BRANCH_NOTE}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {config.options.map((option) => {
          const checked = selected.includes(option)
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                checked
                  ? 'border-[#0b1b62] bg-[#0b1b62]/5 text-[#0b1b62] dark:border-indigo-400 dark:bg-indigo-400/10 dark:text-indigo-200'
                  : 'border-slate-200 text-gray-700 hover:border-[#0b1b62]/40 dark:border-slate-700 dark:text-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                name={name}
                value={option}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option)}
                className="h-4 w-4 accent-[#0b1b62]"
              />
              {option}
            </label>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
