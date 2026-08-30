'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { submitStudent, type SubmitStudentState } from '@/app/parent/enroll-a-student/actions'

const initialState: SubmitStudentState = {}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  error,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
  defaultValue?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-[#0b1b62]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none ${
          error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#0b1b62]'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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
      <div className="flex items-start gap-3 rounded-xl bg-sky-50 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1b62]" />
        <div>
          <p className="text-sm font-semibold text-[#0b1b62]">Parent Account Linked: {parentName}</p>
          <p className="text-sm text-[#0b1b62]/80">(No need to re-enter guardian details)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="border-l-4 border-[#00a3e0] pl-3 text-lg font-bold text-gray-900">
          Student Information
        </h2>

        {state.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Field
            label="First Name"
            name="student_first_name"
            placeholder="e.g., Olivia"
            required
            error={fieldErrors.student_first_name}
            defaultValue={values.student_first_name}
          />
          <Field
            label="Middle Name"
            name="student_middle_name"
            placeholder="Optional"
            error={fieldErrors.student_middle_name}
            defaultValue={values.student_middle_name}
          />
          <Field
            label="Last Name"
            name="student_last_name"
            placeholder="e.g., Santos"
            required
            error={fieldErrors.student_last_name}
            defaultValue={values.student_last_name}
          />
          <Field
            label="Date of Birth"
            name="student_dob"
            type="date"
            required
            error={fieldErrors.student_dob}
            defaultValue={values.student_dob}
          />
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-[#0b1b62]">Gender</p>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
            {['male', 'female'].map((g) => (
              <label
                key={g}
                className={`cursor-pointer px-6 py-2 text-sm font-medium capitalize ${
                  gender === g ? 'bg-[#0b1b62] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
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

      <div className="flex items-center justify-between">
        <Link href="/parent" className="text-sm font-semibold text-[#00a3e0] hover:underline">
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
