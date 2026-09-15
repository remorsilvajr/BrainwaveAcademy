'use client'

import { Check } from 'lucide-react'

// Shared by both enroll wizards (public /enroll and /parent/enroll-a-student)
// so their step tabs render and behave identically.
export function StepTab({
  step,
  activeStep,
  label,
  hasError,
  isDone,
  onClick,
}: {
  step: number
  activeStep: number
  label: string
  hasError: boolean
  // Whether this step's own required fields are actually filled in — NOT
  // just "the visitor has clicked past this step." See enrollment-form.tsx's
  // original note: computing this from `step < activeStep` gave a false
  // "done" checkmark the moment someone clicked ahead, even with required
  // fields still blank.
  isDone: boolean
  onClick: () => void
}) {
  const isActive = step === activeStep
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
        isActive
          ? 'border-[#0b1b62] bg-[#0b1b62]/5 dark:border-indigo-400 dark:bg-indigo-400/10'
          : 'border-slate-200 dark:border-slate-700 hover:border-[#0b1b62]/40 dark:hover:border-indigo-400/40'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          hasError
            ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'
            : isDone
              ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
              : isActive
                ? 'bg-[#0b1b62] text-white dark:bg-indigo-400 dark:text-indigo-950'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {isDone && !hasError ? <Check className="h-3.5 w-3.5" /> : step}
      </span>
      <span
        className={`text-sm font-semibold ${
          isActive ? 'text-[#0b1b62] dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
