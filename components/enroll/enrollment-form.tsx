'use client'

import { useActionState, useState } from 'react'
import { submitApplication, type SubmitApplicationState } from '@/app/enroll/actions'
import { dobInputMin, dobInputMax, MIN_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { DobSelect } from '@/components/ui/dob-select'
import { PlainSelect } from '@/components/ui/plain-select'
import { Field } from '@/components/enroll/enroll-field'
import { StepTab } from '@/components/enroll/step-tab'
import { ProgramSelector, type SelectableClassroom } from '@/components/enroll/program-selector'

const initialState: SubmitApplicationState = {}
const NAME_PATTERN = "[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
const NAME_TITLE = 'Only letters, spaces, hyphens, and apostrophes are allowed.'

const STUDENT_FIELD_KEYS = ['student_first_name', 'student_middle_name', 'student_last_name', 'student_dob', 'student_gender']
const PROGRAM_FIELD_KEYS = ['requested_classroom_id']

export function EnrollmentForm({ classrooms }: { classrooms: SelectableClassroom[] }) {
  const [state, formAction, isPending] = useActionState(submitApplication, initialState)

  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({})
  const [bannerError, setBannerError] = useState<string | undefined>(undefined)

  // Three "pages" (Student, Program, then Parent/Guardian) sharing one
  // <form> and one submission — not separate routes. A real second route
  // would need the in-progress values carried across a full navigation
  // (query params or sessionStorage) just to come back to the same
  // submitApplication call; toggling visibility within one mounted form gets
  // the split UX for free and answers "does switching back keep what I
  // typed" by construction — nothing here ever unmounts, so an uncontrolled
  // <input>'s own DOM value survives switching steps same as a controlled
  // one's React state does.
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Selects need real controlled state. Unlike a text <input>, React
  // re-applies a <select>'s defaultValue on every re-render (not just on
  // mount) — so it was snapping back to blank the instant ANY other state
  // changed, including just clearing a different field's error message.
  const [genderValue, setGenderValue] = useState('')
  const [relationshipValue, setRelationshipValue] = useState('')
  const [parentGenderValue, setParentGenderValue] = useState('')
  const [selectedClassroomId, setSelectedClassroomId] = useState('')

  // Plain text/DOB fields stay uncontrolled (defaultValue, not value) so
  // typing doesn't fight React over cursor position — but the step tabs'
  // "done" checkmark still needs to know whether each required field is
  // actually filled, not just parsed from a defaultValue that never
  // updates after mount. These mirror the DOM value on every change purely
  // for that completeness check, they don't drive the inputs themselves.
  const [studentFirstName, setStudentFirstName] = useState('')
  const [studentLastName, setStudentLastName] = useState('')
  const [studentDob, setStudentDob] = useState('')
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [parentDob, setParentDob] = useState('')
  const [parentContactNumber, setParentContactNumber] = useState('')
  const [parentEmail, setParentEmail] = useState('')

  // Sync local state from the action result as it changes — the "adjusting
  // state when a prop changes" pattern (done inline during render, not in a
  // useEffect: a plain effect here would setState synchronously on every
  // action response, triggering an extra cascading render for no benefit,
  // which is exactly what this project's own set-state-in-effect lint rule
  // catches). `state` is a fresh object on every submitApplication response,
  // so comparing it against the last-seen one tells us a new result just
  // arrived.
  const [syncedState, setSyncedState] = useState(state)
  if (state !== syncedState) {
    setSyncedState(state)
    setLiveErrors(state.fieldErrors ?? {})
    setBannerError(state.error)
    setGenderValue(state.values?.student_gender ?? '')
    setRelationshipValue(state.values?.parent_relationship ?? '')
    setParentGenderValue(state.values?.parent_gender ?? '')
    setSelectedClassroomId(state.values?.requested_classroom_id ?? '')
    setStudentFirstName(state.values?.student_first_name ?? '')
    setStudentLastName(state.values?.student_last_name ?? '')
    setStudentDob(state.values?.student_dob ?? '')
    setParentFirstName(state.values?.parent_first_name ?? '')
    setParentLastName(state.values?.parent_last_name ?? '')
    setParentDob(state.values?.parent_dob ?? '')
    setParentContactNumber(state.values?.parent_contact_number ?? '')
    setParentEmail(state.values?.parent_email ?? '')

    // After a failed submission, jump to whichever step actually has the
    // error(s) rather than leaving the visitor stuck looking at Parent /
    // Guardian (the step Submit lives on) while an unseen Student or
    // Program field is the one blocking them.
    const errorKeys = Object.keys(state.fieldErrors ?? {})
    if (errorKeys.length > 0) {
      if (errorKeys.every((k) => STUDENT_FIELD_KEYS.includes(k))) {
        setStep(1)
      } else if (errorKeys.every((k) => STUDENT_FIELD_KEYS.includes(k) || PROGRAM_FIELD_KEYS.includes(k))) {
        setStep(2)
      } else {
        setStep(3)
      }
    }
  }

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
  const studentStepHasError = Object.keys(liveErrors).some((k) => STUDENT_FIELD_KEYS.includes(k))
  const programStepHasError = Object.keys(liveErrors).some((k) => PROGRAM_FIELD_KEYS.includes(k))
  const parentStepHasError = Object.keys(liveErrors).some(
    (k) => !STUDENT_FIELD_KEYS.includes(k) && !PROGRAM_FIELD_KEYS.includes(k)
  )

  // "Done" means this step's required fields are actually filled, not
  // merely that the visitor has clicked past it — deliberately doesn't
  // also re-check name pattern/minLength/phone-format validity, since
  // liveErrors (folded in via `!studentStepHasError`) already covers that
  // once a submission attempt has run.
  const studentDone = !!studentFirstName && !!studentLastName && !!studentDob && !!genderValue && !studentStepHasError
  const programDone = !!selectedClassroomId && !programStepHasError
  const parentDone =
    !!parentFirstName &&
    !!parentLastName &&
    !!parentDob &&
    !!relationshipValue &&
    !!parentContactNumber &&
    !!parentEmail &&
    !parentStepHasError

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-[#c6c5d2] dark:border-slate-700 bg-white dark:bg-gray-900 p-8 shadow-sm">
      {/* Honeypot — invisible to a real visitor (off-screen, not display:none
          or a hidden input, which some bots specifically skip), but a
          generic form-filling bot commonly fills every field it finds
          including this one. submitApplication silently no-ops if it's
          non-empty, rather than surfacing an error, so a bot gets no signal
          to adapt to. Not a real visitor-facing field, so it's outside the
          normal Field/fieldErrors machinery on purpose. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 0, width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {bannerError && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{bannerError}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <StepTab step={1} activeStep={step} label="Student Information" hasError={studentStepHasError} isDone={studentDone} onClick={() => setStep(1)} />
        <StepTab step={2} activeStep={step} label="Program" hasError={programStepHasError} isDone={programDone} onClick={() => setStep(2)} />
        <StepTab step={3} activeStep={step} label="Parent / Guardian Information" hasError={parentStepHasError} isDone={parentDone} onClick={() => setStep(3)} />
      </div>

      <div className={step === 1 ? 'space-y-8' : 'hidden'}>
        <div>
          <h2 className="mb-4 border-b border-[#00a3e0] pb-2 text-xl font-semibold text-[#0b1b62] dark:text-indigo-300">
            Student Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="First Name"
              name="student_first_name"
              placeholder="e.g. Emma"
              // Only truly `required` while this step is the one visible —
              // a plain <input>'s `required` attribute is NOT exempted from
              // HTML5 constraint validation just because a hidden ancestor
              // set display:none (unlike a `type="hidden"` input, which
              // always is). Left unconditional, submitting from a later
              // step with this step's fields still blank got silently
              // blocked by the browser with no visible error at all, since
              // it can't show a validation bubble on an element that isn't
              // rendered.
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
              min={dobInputMin(MAX_AGE)}
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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-full bg-[#0b1b62] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#08154d]"
          >
            Next: Program →
          </button>
        </div>
      </div>

      <div className={step === 2 ? 'space-y-8' : 'hidden'}>
        <div>
          <h2 className="mb-1 border-b border-[#00a3e0] pb-2 text-xl font-semibold text-[#0b1b62] dark:text-indigo-300">
            Program
          </h2>
          <p className="mb-4 mt-2 text-sm text-[#454650] dark:text-slate-300">
            Choose the program you&apos;d like your child considered for.
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
          />
          {/* Required, but enforced via the server action + this error
              message rather than a native `required` attribute — there's no
              single focusable control here a browser could anchor its own
              validation bubble to (the hidden input backing this isn't a
              sensible target). */}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="order-2 rounded-full border border-slate-200 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-black/5 dark:hover:bg-white/10 sm:order-1"
          >
            ← Back: Student Information
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="order-1 rounded-full bg-[#0b1b62] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] sm:order-2"
          >
            Next: Parent / Guardian Information →
          </button>
        </div>
      </div>

      <div className={step === 3 ? 'space-y-8' : 'hidden'}>
        <div>
          <h2 className="mb-4 border-b border-[#00a3e0] pb-2 text-xl font-semibold text-[#0b1b62] dark:text-indigo-300">
            Parent / Guardian Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="First Name"
              name="parent_first_name"
              placeholder="e.g. John"
              // See student_first_name's comment above — same reasoning,
              // mirrored: this field must stop being natively `required`
              // while another step is the one visible, or an implicit
              // Enter-key submit from a different step's input could
              // silently block on this hidden, still-blank field.
              required={step === 3}
              pattern={NAME_PATTERN}
              title={NAME_TITLE}
              minLength={2}
              defaultValue={values.parent_first_name}
              error={liveErrors.parent_first_name}
              onChange={(v) => {
                setParentFirstName(v)
                clearError('parent_first_name')
              }}
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
              required={step === 3}
              pattern={NAME_PATTERN}
              title={NAME_TITLE}
              minLength={2}
              defaultValue={values.parent_last_name}
              error={liveErrors.parent_last_name}
              onChange={(v) => {
                setParentLastName(v)
                clearError('parent_last_name')
              }}
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
              onChange={(v) => {
                setParentDob(v)
                clearError('parent_dob')
              }}
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
              placeholder="09XX XXX XXXX or +63 9XX XXX XXXX"
              required={step === 3}
              defaultValue={values.parent_contact_number}
              error={liveErrors.parent_contact_number}
              onChange={(v) => {
                setParentContactNumber(v)
                clearError('parent_contact_number')
              }}
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
        </div>

        <div>
          <Field
            label="Email Address"
            name="parent_email"
            type="email"
            placeholder="email@example.com"
            required={step === 3}
            defaultValue={values.parent_email}
            error={liveErrors.parent_email}
            onChange={(v) => {
              setParentEmail(v)
              clearError('parent_email')
            }}
          />
          <p className="mt-1 text-xs text-[#454650] dark:text-slate-300">
            Your login credentials and admission confirmation will be sent here.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm text-[#454650] dark:text-slate-300">
            <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-200 dark:border-slate-700" />
            <span>
              I confirm that all information provided is accurate and true to the best of my
              knowledge.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-[#454650] dark:text-slate-300">
            <input
              type="checkbox"
              name="agreed_to_policies"
              required
              className={`mt-1 h-4 w-4 rounded ${
                liveErrors.agreed_to_policies ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'
              }`}
              onChange={() => clearError('agreed_to_policies')}
            />
            {/* Every child here must live inside this one <span>, not as
                direct children of the flex <label> above — a flex container
                blockifies each direct element child (including an <a>) into
                its own box, which silently drops the inline spacing around
                it and (per the innerText spec's block-boundary rule) turns
                selecting/copying this text into "Academy'sPrivacy Policyand
                Terms of Service" with no spaces at all. A single <span>
                wrapper is itself the one flex item; everything inside it
                stays in a normal inline formatting context where spacing and
                line-wrapping behave normally. */}
            <span>
              I have read and agree to Brainwave Preschool Academy&apos;s{' '}
              <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms-of-service" target="_blank" rel="noreferrer" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
                Terms of Service
              </a>
              , and I consent to the processing of the information above (including my child&apos;s)
              as described there.
            </span>
          </label>
          {liveErrors.agreed_to_policies && (
            <p className="text-xs text-red-600 dark:text-red-400">{liveErrors.agreed_to_policies}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="order-2 rounded-full border border-slate-200 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-black/5 dark:hover:bg-white/10 sm:order-1"
          >
            ← Back: Program
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="order-1 shrink-0 rounded-full bg-[#e6007e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62] sm:order-2"
          >
            {isPending ? 'Submitting…' : 'Submit Application →'}
          </button>
        </div>
      </div>
    </form>
  )
}
