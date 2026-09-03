'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { submitStudent, type SubmitStudentState } from '@/app/parent/enroll-a-student/actions'
import { dobInputMin, dobInputMax, MIN_STUDENT_AGE, MAX_AGE } from '@/lib/dob'
import { DobSelect } from '@/components/ui/dob-select'

const initialState: SubmitStudentState = {}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  error,
  defaultValue,
  min,
  max,
  minLength,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
  defaultValue?: string
  min?: string
  max?: string
  minLength?: number
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        min={min}
        max={max}
        minLength={minLength}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none ${
          error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function EnrollStudentForm({ parentName }: { parentName: string }) {
  const [state, formAction, isPending] = useActionState(submitStudent, initialState)
  const values = state.values ?? {}
  const fieldErrors = state.fieldErrors ?? {}

  const [gender, setGender] = useState(values.student_gender ?? '')

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1b62] dark:text-indigo-300" />
        <div>
          <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Parent Account Linked: {parentName}</p>
          <p className="text-sm text-[#0b1b62]/80 dark:text-indigo-300/80">(No need to re-enter guardian details)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="border-l-4 border-[#00a3e0] pl-3 text-lg font-bold text-gray-900 dark:text-gray-100">
          Student Information
        </h2>

        {state.error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="First Name"
            name="student_first_name"
            placeholder="e.g., Olivia"
            required
            error={fieldErrors.student_first_name}
            defaultValue={values.student_first_name}
            minLength={2}
          />
          <Field
            label="Middle Name"
            name="student_middle_name"
            placeholder="Optional"
            error={fieldErrors.student_middle_name}
            defaultValue={values.student_middle_name}
            minLength={2}
          />
          <Field
            label="Last Name"
            name="student_last_name"
            placeholder="e.g., Santos"
            required
            error={fieldErrors.student_last_name}
            defaultValue={values.student_last_name}
            minLength={2}
          />
          <DobSelect
            label="Date of Birth"
            name="student_dob"
            required
            error={fieldErrors.student_dob}
            defaultValue={values.student_dob}
            min={dobInputMin(MAX_AGE)}
            max={dobInputMax(MIN_STUDENT_AGE)}
          />
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Gender</p>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            {['male', 'female'].map((g) => (
              <label
                key={g}
                className={`cursor-pointer px-6 py-2 text-sm font-medium capitalize ${
                  gender === g ? 'bg-[#0b1b62] text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="student_gender"
                  value={g}
                  checked={gender === g}
                  onChange={() => setGender(g)}
                  className="sr-only"
                  required
                />
                {g}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-[#454650] dark:text-slate-400">
        By submitting, you consent to the processing of this student&apos;s information as
        described in our{' '}
        <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
          Privacy Policy
        </a>.
      </p>

      <div className="flex items-center justify-between">
        <Link href="/parent" className="text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#e6007e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
        >
          {isPending ? 'Submitting…' : 'Submit Student Application'}
        </button>
      </div>
    </form>
  )
}
