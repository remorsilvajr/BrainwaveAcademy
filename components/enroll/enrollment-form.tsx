'use client'

import { useActionState, useEffect, useState } from 'react'
import { submitApplication, type SubmitApplicationState } from '@/app/enroll/actions'
import { dobInputMin, dobInputMax, MIN_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { DobSelect } from '@/components/ui/dob-select'

const initialState: SubmitApplicationState = {}
const NAME_PATTERN = "[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
const NAME_TITLE = 'Only letters, spaces, hyphens, and apostrophes are allowed.'

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  error,
  pattern,
  title,
  defaultValue,
  onChange,
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
  pattern?: string
  title?: string
  defaultValue?: string
  onChange?: () => void
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
        pattern={pattern}
        title={title}
        defaultValue={defaultValue}
        onChange={onChange}
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

export function EnrollmentForm() {
  const [state, formAction, isPending] = useActionState(submitApplication, initialState)

  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({})
  const [bannerError, setBannerError] = useState<string | undefined>(undefined)

  // Selects need real controlled state. Unlike a text <input>, React
  // re-applies a <select>'s defaultValue on every re-render (not just on
  // mount) — so it was snapping back to blank the instant ANY other state
  // changed, including just clearing a different field's error message.
  const [genderValue, setGenderValue] = useState('')
  const [relationshipValue, setRelationshipValue] = useState('')
  const [parentGenderValue, setParentGenderValue] = useState('')

  useEffect(() => {
    setLiveErrors(state.fieldErrors ?? {})
    setBannerError(state.error)
    setGenderValue(state.values?.student_gender ?? '')
    setRelationshipValue(state.values?.parent_relationship ?? '')
    setParentGenderValue(state.values?.parent_gender ?? '')
  }, [state])

  function clearError(name: string) {
    setLiveErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      // Once every highlighted field is fixed, the summary banner can
      // disappear too — it only makes sense while at least one is still
      // showing.
      if (Object.keys(next).length === 0) {
        setBannerError(undefined)
      }
      return next
    })
  }

  const values = state.values ?? {}

  return (
    <form action={formAction} className="space-y-8 rounded-xl border border-[#c6c5d2] dark:border-slate-700 bg-white dark:bg-gray-900 p-8 shadow-sm">
      {bannerError && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{bannerError}</p>
      )}

      <div>
        <h2 className="mb-4 border-b border-[#00a3e0] pb-2 text-xl font-semibold text-[#0b1b62] dark:text-indigo-300">
          Student Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="First Name"
            name="student_first_name"
            placeholder="e.g. Emma"
            required
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            minLength={2}
            defaultValue={values.student_first_name}
            error={liveErrors.student_first_name}
            onChange={() => clearError('student_first_name')}
          />
          <Field
            label="Middle Name"
            name="student_middle_name"
            placeholder="e.g. Grace"
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            minLength={2}
            defaultValue={values.student_middle_name}
            error={liveErrors.student_middle_name}
            onChange={() => clearError('student_middle_name')}
          />
          <Field
            label="Last Name"
            name="student_last_name"
            placeholder="e.g. Smith"
            required
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            minLength={2}
            defaultValue={values.student_last_name}
            error={liveErrors.student_last_name}
            onChange={() => clearError('student_last_name')}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DobSelect
            label="Date of Birth"
            name="student_dob"
            required
            defaultValue={values.student_dob}
            error={liveErrors.student_dob}
            min={dobInputMin(MAX_AGE)}
            max={dobInputMax(MIN_STUDENT_AGE)}
            onChange={() => clearError('student_dob')}
          />
          <div>
            <label htmlFor="student_gender" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Gender
            </label>
            {/* Matches DobSelect's "Day/Month/Year" mini-label row so this select lines up with those inputs instead of sitting a row higher. */}
            <span aria-hidden className="mb-1 block text-xs font-medium invisible">Gender</span>
            <select
              id="student_gender"
              name="student_gender"
              required
              value={genderValue}
              onChange={(e) => {
                setGenderValue(e.target.value)
                clearError('student_gender')
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none ${
                liveErrors.student_gender
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
              }`}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {liveErrors.student_gender && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{liveErrors.student_gender}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 border-b border-[#00a3e0] pb-2 text-xl font-semibold text-[#0b1b62] dark:text-indigo-300">
          Parent / Guardian Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="First Name"
            name="parent_first_name"
            placeholder="e.g. John"
            required
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            minLength={2}
            defaultValue={values.parent_first_name}
            error={liveErrors.parent_first_name}
            onChange={() => clearError('parent_first_name')}
          />
          <Field
            label="Middle Name"
            name="parent_middle_name"
            placeholder="Optional"
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            minLength={2}
            defaultValue={values.parent_middle_name}
            error={liveErrors.parent_middle_name}
            onChange={() => clearError('parent_middle_name')}
          />
          <Field
            label="Last Name"
            name="parent_last_name"
            placeholder="e.g. Smith"
            required
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            minLength={2}
            defaultValue={values.parent_last_name}
            error={liveErrors.parent_last_name}
            onChange={() => clearError('parent_last_name')}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DobSelect
            label="Date of Birth"
            name="parent_dob"
            required
            defaultValue={values.parent_dob}
            error={liveErrors.parent_dob}
            min={dobInputMin(MAX_AGE)}
            max={dobInputMax(MIN_ADULT_AGE)}
            onChange={() => clearError('parent_dob')}
          />
          <div>
            <label htmlFor="parent_relationship" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Relationship
            </label>
            <select
              id="parent_relationship"
              name="parent_relationship"
              required
              value={relationshipValue}
              onChange={(e) => {
                setRelationshipValue(e.target.value)
                clearError('parent_relationship')
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none ${
                liveErrors.parent_relationship
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
              }`}
            >
              <option value="">Select Relationship</option>
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Guardian">Guardian</option>
            </select>
            {liveErrors.parent_relationship && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{liveErrors.parent_relationship}</p>
            )}
          </div>
          {relationshipValue === 'Guardian' && (
            <div>
              <label htmlFor="parent_gender" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                Gender
              </label>
              <select
                id="parent_gender"
                name="parent_gender"
                value={parentGenderValue}
                onChange={(e) => setParentGenderValue(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400"
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          )}
          <Field
            label="Contact Number"
            name="parent_contact_number"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            required
            defaultValue={values.parent_contact_number}
            error={liveErrors.parent_contact_number}
            onChange={() => clearError('parent_contact_number')}
          />
        </div>
        <div className="mt-4">
          <Field
            label="Email Address"
            name="parent_email"
            type="email"
            placeholder="email@example.com"
            required
            defaultValue={values.parent_email}
            error={liveErrors.parent_email}
            onChange={() => clearError('parent_email')}
          />
          <p className="mt-1 text-xs text-[#454650] dark:text-slate-300">
            Your login credentials and admission confirmation will be sent here.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2 text-sm text-[#454650] dark:text-slate-300">
          <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-200 dark:border-slate-700" />
          I confirm that all information provided is accurate and true to the best of my
          knowledge.
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-full bg-[#e6007e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62]"
        >
          {isPending ? 'Submitting…' : 'Submit Application →'}
        </button>
      </div>
    </form>
  )
}
