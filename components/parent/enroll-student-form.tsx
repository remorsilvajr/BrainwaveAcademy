'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { submitStudent, type SubmitStudentState } from '@/app/parent/enroll-a-student/actions'
import { dobInputMin, dobInputMax, MIN_STUDENT_AGE, MAX_STUDENT_AGE } from '@/lib/dob'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'
import { DobSelect } from '@/components/ui/dob-select'
import { PlainSelect } from '@/components/ui/plain-select'
import { Field } from '@/components/enroll/enroll-field'
import { StepTab } from '@/components/enroll/step-tab'
import { ProgramSelector, type SelectableClassroom } from '@/components/enroll/program-selector'

const initialState: SubmitStudentState = {}
const NAME_PATTERN = "[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
const NAME_TITLE = 'Only letters, spaces, hyphens, and apostrophes are allowed.'

const STUDENT_FIELD_KEYS = ['student_first_name', 'student_middle_name', 'student_last_name', 'student_dob', 'student_gender']

export function EnrollStudentForm({
  parentName,
  classrooms,
}: {
  parentName: string
  classrooms: SelectableClassroom[]
}) {
  const [state, formAction, isPending] = useActionState(submitStudent, initialState)

  // Same two-page-in-one-form shape as the public enroll form (see its own
  // comment for why this beats a real second route) — just Student
  // Information then Program, since parent/guardian identity is already on
  // file for a logged-in parent.
  const [step, setStep] = useState<1 | 2>(1)

  const [liveErrors, setLiveErrors] = useState<Record<string, string>>(state.fieldErrors ?? {})
  const [genderValue, setGenderValue] = useState(state.values?.student_gender ?? '')
  const [selectedClassroomId, setSelectedClassroomId] = useState(state.values?.requested_classroom_id ?? '')
  const [studentFirstName, setStudentFirstName] = useState(state.values?.student_first_name ?? '')
  const [studentLastName, setStudentLastName] = useState(state.values?.student_last_name ?? '')
  const [studentDob, setStudentDob] = useState(state.values?.student_dob ?? '')

  const [syncedState, setSyncedState] = useState(state)
  if (state !== syncedState) {
    setSyncedState(state)
    setLiveErrors(state.fieldErrors ?? {})
    setGenderValue(state.values?.student_gender ?? '')
    setSelectedClassroomId(state.values?.requested_classroom_id ?? '')
    setStudentFirstName(state.values?.student_first_name ?? '')
    setStudentLastName(state.values?.student_last_name ?? '')
    setStudentDob(state.values?.student_dob ?? '')

    const errorKeys = Object.keys(state.fieldErrors ?? {})
    if (errorKeys.length > 0) {
      setStep(errorKeys.every((k) => STUDENT_FIELD_KEYS.includes(k)) ? 1 : 2)
    }
  }

  // See enrollment-form.tsx's identical comment: adjusting this component's
  // OWN selectedClassroomId during its OWN render, in response to noticing
  // its OWN studentDob state changed, is the legal version of this pattern
  // — doing it inside ProgramSelector instead (calling the onChange prop,
  // which sets state in this different component) is what triggers React's
  // "Cannot update a component while rendering a different component".
  const [lastCheckedDob, setLastCheckedDob] = useState(studentDob)
  if (studentDob !== lastCheckedDob) {
    setLastCheckedDob(studentDob)
    const selected = classrooms.find((c) => c.id === selectedClassroomId)
    if (selected && studentDob && !isAgeEligibleForClassroom(studentDob, selected)) {
      setSelectedClassroomId('')
    }
  }

  function clearError(name: string) {
    setLiveErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const values = state.values ?? {}
  const studentStepHasError = Object.keys(liveErrors).some((k) => STUDENT_FIELD_KEYS.includes(k))
  const programStepHasError = Object.keys(liveErrors).some((k) => k === 'requested_classroom_id' || k === 'requested_program_options')

  const studentDone = !!studentFirstName && !!studentLastName && !!studentDob && !!genderValue && !studentStepHasError
  const programDone = !!selectedClassroomId && !programStepHasError

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1b62] dark:text-indigo-300" />
        <div>
          <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Parent Account Linked: {parentName}</p>
          <p className="text-sm text-[#0b1b62]/80 dark:text-indigo-300/80">(No need to re-enter guardian details)</p>
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <StepTab step={1} activeStep={step} label="Student Information" hasError={studentStepHasError} isDone={studentDone} onClick={() => setStep(1)} />
        <StepTab step={2} activeStep={step} label="Program" hasError={programStepHasError} isDone={programDone} onClick={() => setStep(2)} />
      </div>

      <div className={step === 1 ? 'space-y-6' : 'hidden'}>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="border-l-4 border-[#00a3e0] pl-3 text-lg font-bold text-gray-900 dark:text-gray-100">
            Student Information
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="First Name"
              name="student_first_name"
              placeholder="e.g. Olivia"
              // See the public enroll form's identical comment: a plain
              // <input>'s `required` isn't exempt from HTML5 constraint
              // validation just because a hidden (display:none) ancestor
              // step made it invisible.
              required={step === 1}
              pattern={NAME_PATTERN}
              title={NAME_TITLE}
              minLength={2}
              defaultValue={values.student_first_name}
              error={liveErrors.student_first_name}
              onChange={(v) => {
                setStudentFirstName(v)
                clearError('student_first_name')
              }}
            />
            <Field
              label="Middle Name"
              name="student_middle_name"
              placeholder="Optional"
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
              placeholder="e.g. Santos"
              required={step === 1}
              pattern={NAME_PATTERN}
              title={NAME_TITLE}
              minLength={2}
              defaultValue={values.student_last_name}
              error={liveErrors.student_last_name}
              onChange={(v) => {
                setStudentLastName(v)
                clearError('student_last_name')
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DobSelect
              label="Date of Birth"
              name="student_dob"
              required
              defaultValue={values.student_dob}
              error={liveErrors.student_dob}
              min={dobInputMin(MAX_STUDENT_AGE)}
              max={dobInputMax(MIN_STUDENT_AGE)}
              onChange={(v) => {
                setStudentDob(v)
                clearError('student_dob')
              }}
            />
            <PlainSelect
              label="Gender"
              name="student_gender"
              required
              extraLabelRow
              value={genderValue}
              onChange={(v) => {
                setGenderValue(v)
                clearError('student_gender')
              }}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
              placeholder="Select Gender"
              error={liveErrors.student_gender}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link href="/parent" className="text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-lg bg-[#0b1b62] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#08154d]"
          >
            Next: Program →
          </button>
        </div>
      </div>

      <div className={step === 2 ? 'space-y-6' : 'hidden'}>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="border-l-4 border-[#00a3e0] pl-3 text-lg font-bold text-gray-900 dark:text-gray-100">
            Program
          </h2>
          <p className="mb-4 mt-2 text-sm text-[#454650] dark:text-slate-400">
            Choose the program you&apos;d like this student considered for.
          </p>
          <ProgramSelector
            classrooms={classrooms}
            studentDob={studentDob}
            value={selectedClassroomId}
            onChange={(id) => {
              setSelectedClassroomId(id)
              clearError('requested_classroom_id')
            }}
            error={liveErrors.requested_classroom_id}
            optionsError={liveErrors.requested_program_options}
            onOptionsChange={() => clearError('requested_program_options')}
          />
        </div>

        <p className="text-xs text-[#454650] dark:text-slate-400">
          By submitting, you consent to the processing of this student&apos;s information as
          described in our{' '}
          <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
            Privacy Policy
          </a>.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="order-2 rounded-lg border border-slate-200 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-black/5 dark:hover:bg-white/10 sm:order-1"
          >
            ← Back: Student Information
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="order-1 rounded-lg bg-[#e6007e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60 sm:order-2"
          >
            {isPending ? 'Submitting…' : 'Submit Student Application'}
          </button>
        </div>
      </div>
    </form>
  )
}
