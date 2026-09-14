'use client'

import { useActionState, useState } from 'react'
import { Check } from 'lucide-react'
import { submitApplication, type SubmitApplicationState } from '@/app/enroll/actions'
import { dobInputMin, dobInputMax, MIN_STUDENT_AGE, MIN_ADULT_AGE, MAX_AGE } from '@/lib/dob'
import { DobSelect } from '@/components/ui/dob-select'
import { PlainSelect } from '@/components/ui/plain-select'

const initialState: SubmitApplicationState = {}
const NAME_PATTERN = "[A-Za-zÀ-ÖØ-öø-ÿ' -]+"
const NAME_TITLE = 'Only letters, spaces, hyphens, and apostrophes are allowed.'

const STUDENT_FIELD_KEYS = ['student_first_name', 'student_middle_name', 'student_last_name', 'student_dob', 'student_gender']

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
  extraLabelRow,
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
  // Matches DobSelect's "Day/Month/Year" mini-label row so this field's box
  // lines up with a DobSelect sitting beside it in the same grid row,
  // instead of sitting a row higher (DobSelect has two label rows above its
  // inputs where a plain field only has one).
  extraLabelRow?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {extraLabelRow && <span aria-hidden className="mb-1 block text-xs font-medium invisible">{label}</span>}
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

function StepTab({
  step,
  activeStep,
  label,
  hasError,
  onClick,
}: {
  step: number
  activeStep: number
  label: string
  hasError: boolean
  onClick: () => void
}) {
  const isActive = step === activeStep
  const isDone = step < activeStep
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

export function EnrollmentForm() {
  const [state, formAction, isPending] = useActionState(submitApplication, initialState)

  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({})
  const [bannerError, setBannerError] = useState<string | undefined>(undefined)

  // Two "pages" (Student, then Parent/Guardian) sharing one <form> and one
  // submission — not two separate routes. A real second route would need
  // the in-progress values carried across a full navigation (query params or
  // sessionStorage) just to come back to the same submitApplication call;
  // toggling visibility within one mounted form gets the split UX for free
  // and answers "does switching back keep what I typed" by construction —
  // nothing here ever unmounts, so an uncontrolled <input>'s own DOM value
  // survives switching steps same as a controlled one's React state does.
  const [step, setStep] = useState<1 | 2>(1)

  // Selects need real controlled state. Unlike a text <input>, React
  // re-applies a <select>'s defaultValue on every re-render (not just on
  // mount) — so it was snapping back to blank the instant ANY other state
  // changed, including just clearing a different field's error message.
  const [genderValue, setGenderValue] = useState('')
  const [relationshipValue, setRelationshipValue] = useState('')
  const [parentGenderValue, setParentGenderValue] = useState('')

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

    // After a failed submission, jump to whichever step actually has the
    // error(s) rather than leaving the visitor stuck looking at Parent /
    // Guardian (step 2, where Submit lives) while an unseen Student field
    // is the one blocking them.
    const errorKeys = Object.keys(state.fieldErrors ?? {})
    if (errorKeys.length > 0) {
      setStep(errorKeys.every((k) => STUDENT_FIELD_KEYS.includes(k)) ? 1 : 2)
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
  const parentStepHasError = Object.keys(liveErrors).some((k) => !STUDENT_FIELD_KEYS.includes(k))

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
        <StepTab step={1} activeStep={step} label="Student Information" hasError={studentStepHasError} onClick={() => setStep(1)} />
        <StepTab step={2} activeStep={step} label="Parent / Guardian Information" hasError={parentStepHasError} onClick={() => setStep(2)} />
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
              // always is). Left unconditional, submitting from step 2 with
              // this step's fields still blank got silently blocked by the
              // browser with no visible error at all, since it can't show a
              // validation bubble on an element that isn't rendered.
              required={step === 1}
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
              required={step === 1}
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
            Next: Parent / Guardian Information →
          </button>
        </div>
      </div>

      <div className={step === 2 ? 'space-y-8' : 'hidden'}>
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
              // while step 1 is the one visible, or an implicit Enter-key
              // submit from a step 1 input could silently block on this
              // hidden, still-blank field.
              required={step === 2}
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
              required={step === 2}
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
              placeholder="+63 9XX XXX XXXX"
              required={step === 2}
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
        </div>

        <div>
          <Field
            label="Email Address"
            name="parent_email"
            type="email"
            placeholder="email@example.com"
            required={step === 2}
            defaultValue={values.parent_email}
            error={liveErrors.parent_email}
            onChange={() => clearError('parent_email')}
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
            onClick={() => setStep(1)}
            className="order-2 rounded-full border border-slate-200 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-black/5 dark:hover:bg-white/10 sm:order-1"
          >
            ← Back: Student Information
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
