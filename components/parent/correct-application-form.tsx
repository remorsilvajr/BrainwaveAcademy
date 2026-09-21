'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { resubmitApplication, type ResubmitState } from '@/app/parent/enrollment-status/actions'
import { dobInputMin, dobInputMax, MIN_STUDENT_AGE, MAX_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'
import { DobSelect } from '@/components/ui/dob-select'
import { PlainSelect } from '@/components/ui/plain-select'
import { Field } from '@/components/enroll/enroll-field'
import { ProgramSelector, type SelectableClassroom } from '@/components/enroll/program-selector'

const initialState: ResubmitState = {}
const NAME_PATTERN = "[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
const NAME_TITLE = 'Only letters, spaces, hyphens, and apostrophes are allowed.'

export type CorrectableApplication = {
  id: string
  student_first_name: string
  student_middle_name: string | null
  student_last_name: string
  student_dob: string
  student_gender: string
  parent_first_name: string
  parent_middle_name: string | null
  parent_last_name: string
  parent_dob: string
  parent_relationship: string
  parent_gender: string | null
  parent_contact_number: string
  parent_email: string
  requested_classroom_id: string | null
  requested_program_options: string[] | null
  review_notes: string | null
}

const card = 'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6'
const cardTitle = 'border-l-4 border-[#00a3e0] pl-3 text-lg font-bold text-gray-900 dark:text-gray-100'

// Edit-and-resubmit for a request the school asked to have corrected. Everything the
// original form collected is here, prefilled, except the email (the login) and the
// password. Validation is repeated on the server (resubmitApplication).
export function CorrectApplicationForm({
  application,
  classrooms,
}: {
  application: CorrectableApplication
  classrooms: SelectableClassroom[]
}) {
  const [state, formAction, isPending] = useActionState(resubmitApplication.bind(null, application.id), initialState)

  const initial: Record<string, string> = {
    student_first_name: application.student_first_name,
    student_middle_name: application.student_middle_name ?? '',
    student_last_name: application.student_last_name,
    student_dob: application.student_dob,
    student_gender: application.student_gender,
    parent_first_name: application.parent_first_name,
    parent_middle_name: application.parent_middle_name ?? '',
    parent_last_name: application.parent_last_name,
    parent_dob: application.parent_dob,
    parent_relationship: application.parent_relationship,
    parent_gender: application.parent_gender ?? '',
    parent_contact_number: application.parent_contact_number,
    requested_classroom_id: application.requested_classroom_id ?? '',
  }
  // After a failed submit the server echoes what was typed; until then the saved values.
  const values = state.values ?? initial

  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({})
  const [genderValue, setGenderValue] = useState(values.student_gender)
  const [relationshipValue, setRelationshipValue] = useState(values.parent_relationship)
  const [parentGenderValue, setParentGenderValue] = useState(values.parent_gender)
  const [selectedClassroomId, setSelectedClassroomId] = useState(values.requested_classroom_id)
  const [studentDob, setStudentDob] = useState(values.student_dob)

  const [syncedState, setSyncedState] = useState(state)
  if (state !== syncedState) {
    setSyncedState(state)
    setLiveErrors(state.fieldErrors ?? {})
    if (state.values) {
      setGenderValue(state.values.student_gender ?? '')
      setRelationshipValue(state.values.parent_relationship ?? '')
      setParentGenderValue(state.values.parent_gender ?? '')
      setSelectedClassroomId(state.values.requested_classroom_id ?? '')
      setStudentDob(state.values.student_dob ?? '')
    }
  }

  // Same rule as the enroll forms: if a changed date of birth makes the chosen program
  // ineligible, clear it (done in this component's own render, not in ProgramSelector's).
  const [lastCheckedDob, setLastCheckedDob] = useState(studentDob)
  if (studentDob !== lastCheckedDob) {
    setLastCheckedDob(studentDob)
    const selected = classrooms.find((c) => c.id === selectedClassroomId)
    if (selected && studentDob && !isAgeEligibleForClassroom(studentDob, selected)) setSelectedClassroomId('')
  }

  function clearError(name: string) {
    setLiveErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  return (
    <form action={formAction} className="space-y-6">
      {application.review_notes && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">What the school asked you to correct</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{application.review_notes}</p>
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{state.error}</p>
      )}

      <div className={card}>
        <h2 className={cardTitle}>Student Information</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="First Name"
            name="student_first_name"
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

      <div className={card}>
        <h2 className={cardTitle}>Program</h2>
        <p className="mb-4 mt-2 text-sm text-[#454650] dark:text-slate-400">Choose the program you&apos;d like this student considered for.</p>
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
          initialSelection={
            application.requested_classroom_id
              ? { classroomId: application.requested_classroom_id, options: application.requested_program_options ?? [] }
              : undefined
          }
        />
      </div>

      <div className={card}>
        <h2 className={cardTitle}>Parent / Guardian Information</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="First Name"
            name="parent_first_name"
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
            required
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            minLength={2}
            defaultValue={values.parent_last_name}
            error={liveErrors.parent_last_name}
            onChange={() => clearError('parent_last_name')}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <PlainSelect
            label="Relationship"
            name="parent_relationship"
            required
            extraLabelRow
            value={relationshipValue}
            onChange={(v) => {
              setRelationshipValue(v)
              clearError('parent_relationship')
            }}
            options={[
              { value: 'Mother', label: 'Mother' },
              { value: 'Father', label: 'Father' },
              { value: 'Guardian', label: 'Guardian' },
            ]}
            placeholder="Select Relationship"
            error={liveErrors.parent_relationship}
          />
        </div>
        <div className={`mt-4 grid grid-cols-1 gap-4 ${relationshipValue === 'Guardian' ? 'sm:grid-cols-2' : ''}`}>
          <Field
            label="Contact Number"
            name="parent_contact_number"
            type="tel"
            required
            defaultValue={values.parent_contact_number}
            error={liveErrors.parent_contact_number}
            onChange={() => clearError('parent_contact_number')}
          />
          {relationshipValue === 'Guardian' && (
            <PlainSelect
              label="Gender"
              name="parent_gender"
              value={parentGenderValue}
              onChange={setParentGenderValue}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
              placeholder="Not set"
            />
          )}
        </div>
        <p className="mt-4 text-xs text-[#454650] dark:text-slate-400">
          Your login email ({application.parent_email}) can&apos;t be changed here.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/parent/enrollment-status?student=${application.id}`}
          className="text-sm font-semibold text-[#00a3e0] hover:underline dark:text-sky-400"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#e6007e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
        >
          {isPending ? 'Sending…' : 'Resubmit Request'}
        </button>
      </div>
    </form>
  )
}
