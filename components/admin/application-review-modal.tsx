'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, X } from 'lucide-react'
import {
  saveDocumentReview,
  requestCorrections,
  getSignedDocumentUrl,
  approveAndCreateStudentRecord,
} from '@/app/admin/applications/actions'
import { calculateAge, formatDateLong } from '@/lib/format'
import { documentLabels, documentShortLabels, documentOrder, validateCorrectionNotes, CORRECTION_NOTE_MAX } from '@/lib/documents'
import { isAgeEligibleForClassroom, classroomAgeRangeLabel } from '@/lib/classrooms'
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal'
import { Modal } from '@/components/ui/modal'
import { ProgramOptionsPicker } from '@/components/enroll/program-options-picker'
import { isHourlyProgram } from '@/lib/program-options'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type DocRow = { document_type: string; file_url: string; verification_status: string; correction_note?: string | null }

type Classroom = {
  id: string
  name: string
  slug: string
  min_age_months: number | null
  max_age_months: number | null
  tuition_fee: number
  activity_fee: number
}

type Application = {
  id: string
  application_ref: string
  review_notes: string | null
  created_parent_id: string | null
  created_student_id: string | null
  student_first_name: string
  student_last_name: string
  student_dob: string
  parent_first_name: string
  parent_last_name: string
  parent_relationship: string
  parent_contact_number: string
  parent_email: string
  requested_classroom_id: string | null
  requested_program_options: string[]
  documents: DocRow[]
}

type DocStatus = 'valid' | 'needs_correction' | 'pending'

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

export function ApplicationReviewModal({
  application,
  classrooms,
  onClose,
}: {
  application: Application
  classrooms: Classroom[]
  onClose: () => void
}) {
  const router = useRouter()
  const studentName = `${application.student_first_name} ${application.student_last_name}`

  const [statuses, setStatuses] = useState<Record<string, DocStatus>>(() => {
    const initial: Record<string, DocStatus> = {}
    for (const type of documentOrder) {
      const doc = application.documents.find((d) => d.document_type === type)
      initial[type] = (doc?.verification_status as DocStatus) ?? 'pending'
    }
    return initial
  })
  const [notes, setNotes] = useState(application.review_notes ?? '')
  // What the parent will read for each document marked Needs Correction (starts from any
  // note already saved on the document).
  const [correctionNotes, setCorrectionNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const doc of application.documents) initial[doc.document_type] = doc.correction_note ?? ''
    return initial
  })
  const [classroomPick, setClassroomPick] = useState(application.requested_classroom_id ?? '')
  // The options the family asked for come pre-ticked, but only while the program is still the one they requested.
  const [optionPicks, setOptionPicks] = useState<string[]>(application.requested_program_options ?? [])
  const pickedClassroom = classrooms.find((c) => c.id === classroomPick)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<'saved' | 'corrections' | 'enrolled' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [confirmingCorrections, setConfirmingCorrections] = useState(false)

  const hasUploadedDocs = application.documents.length > 0
  const allValid = documentOrder.every((type) => statuses[type] === 'valid')
  const needsCorrectionTypes = documentOrder.filter((type) => statuses[type] === 'needs_correction')
  const hasParentAccount = !!application.created_parent_id
  // Asking for corrections needs a note on every document marked as needing one.
  const correctionNoteProblem = validateCorrectionNotes(statuses, correctionNotes, true)
  // Local `result` state, not just the (possibly stale, until the parent
  // Server Component re-renders after router.refresh()) `application` prop —
  // otherwise the "Approve & Create Student Record" button stays visible
  // and clickable right after a successful creation, looking like nothing
  // happened.
  const alreadyHasStudent = !!application.created_student_id || result === 'enrolled'

  // The confirmation banner renders at the top of this scrollable panel,
  // but admins are typically scrolled to the bottom (where the action
  // buttons are) after reviewing all 4 documents — without this, the
  // banner appears completely off-screen and the button just reverts to
  // its normal clickable state, looking exactly like nothing happened.
  function showResult(value: 'saved' | 'corrections' | 'enrolled') {
    setResult(value)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleViewDocument(type: string) {
    const doc = application.documents.find((d) => d.document_type === type)
    if (!doc) return
    try {
      const result = await getSignedDocumentUrl(doc.file_url)
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setPreviewTitle(documentLabels[type] ?? 'Document')
      setPreviewUrl(result.url)
    } catch {
      setErrorMessage('Could not open that document.')
    }
  }

  async function handleSaveReview() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const saved = await saveDocumentReview(application.id, statuses, notes, correctionNotes)
      if (saved?.error) {
        setErrorMessage(saved.error)
        return
      }
      showResult('saved')
      router.refresh()
    } catch {
      setErrorMessage('Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRequestCorrections() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const requested = await requestCorrections(application.id, statuses, notes, correctionNotes)
      // Closed on error too, not just success — ConfirmDialog has no error
      // slot of its own, so the errorMessage banner below (rendered in the
      // main modal body) would otherwise be invisible behind it.
      setConfirmingCorrections(false)
      if (requested?.error) {
        setErrorMessage(requested.error)
        return
      }
      showResult('corrections')
      router.refresh()
    } catch {
      setConfirmingCorrections(false)
      setErrorMessage('Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleApproveAndCreateStudent() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const saved = await saveDocumentReview(application.id, statuses, notes, correctionNotes)
      if (saved?.error) {
        setErrorMessage(saved.error)
        return
      }
      const result = await approveAndCreateStudentRecord(application.id, classroomPick || null, optionPicks)
      if (result?.error) {
        setErrorMessage(result.error)
        return
      }
      showResult('enrolled')
      router.refresh()
    } catch {
      setErrorMessage('Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Modal onClose={onClose} maxWidth="lg">
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Review</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {application.application_ref} • {studentName}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {result && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-4 text-center">
              <p className="font-medium text-green-800">
                {result === 'saved' && 'Review saved.'}
                {result === 'corrections' && 'Corrections requested. Parent notified by email.'}
                {result === 'enrolled' && `Student record created for ${studentName}!`}
              </p>
            </div>
          )}

          {!hasParentAccount && (
            <p className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              No parent account exists for this application yet. Approve it via Enroll A
              Student first.
            </p>
          )}

          {alreadyHasStudent && (
            <p className="mb-4 rounded-lg bg-sky-50 dark:bg-sky-950/30 px-3 py-2 text-sm text-sky-700 dark:text-sky-300">
              A student record already exists for this application.
            </p>
          )}

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Applicant Summary
          </p>
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 sm:grid-cols-2">
            <InfoField
              label="Date of Birth"
              value={`${formatDateLong(application.student_dob)} (${calculateAge(application.student_dob)}y)`}
            />
            <InfoField
              label="Primary Guardian"
              value={`${application.parent_first_name} ${application.parent_last_name} (${application.parent_relationship})`}
            />
            <InfoField label="Email" value={application.parent_email} />
            <InfoField label="Phone" value={application.parent_contact_number} />
          </div>

          <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Program
          </p>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {application.requested_classroom_id
                ? 'Requested by the parent at enrollment. Change it below if needed before approving.'
                : 'No program was requested at enrollment. You can assign one now, or leave unassigned and assign it later from the Student Record.'}
            </p>
            <select
              value={classroomPick}
              onChange={(e) => {
                setClassroomPick(e.target.value)
                setOptionPicks(e.target.value === application.requested_classroom_id ? (application.requested_program_options ?? []) : [])
              }}
              disabled={alreadyHasStudent}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none disabled:opacity-60"
            >
              <option value="">Unassigned</option>
              {classrooms.map((c) => {
                const eligible = isAgeEligibleForClassroom(application.student_dob, c)
                return (
                  <option key={c.id} value={c.id} disabled={!eligible}>
                    {c.name} ({classroomAgeRangeLabel(c)}){!eligible ? ', age not eligible' : ''}
                  </option>
                )
              })}
            </select>
            {pickedClassroom && isHourlyProgram(pickedClassroom.slug) && (
              <div className="mt-3">
                <ProgramOptionsPicker
                  slug={pickedClassroom.slug}
                  selected={optionPicks}
                  onChange={setOptionPicks}
                  disabled={alreadyHasStudent}
                />
              </div>
            )}
          </div>

          <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Document Verification
          </p>

          {!hasUploadedDocs && (
            <p className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              This parent hasn&apos;t uploaded any documents yet, so there&apos;s nothing to review until they
              visit Requirements in their portal.
            </p>
          )}

          <div className="space-y-3">
            {documentOrder.map((type) => {
              const doc = application.documents.find((d) => d.document_type === type)
              return (
                <div key={type} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{documentLabels[type]}</p>
                  </div>
                  {doc ? (
                    <button
                      onClick={() => handleViewDocument(type)}
                      className="mb-3 text-sm text-[#00a3e0] dark:text-sky-400 underline"
                    >
                      View Document
                    </button>
                  ) : (
                    <p className="mb-3 text-sm text-gray-400 dark:text-gray-500">Not uploaded yet</p>
                  )}
                  {doc && (
                    // Two toggle buttons, not native <input type="radio">
                    // pairs — those were unstyled, and the browser's own
                    // native hover/focus rendering for a bare radio control
                    // was reported live as intermittently shifting this
                    // row's height by a subpixel amount, misaligning the
                    // borders above/below it. A plain CSS button has no
                    // such native rendering variance. Same
                    // selected/unselected pill pattern as the attendance
                    // Present/Late/Absent buttons in roster-checkin.tsx.
                    <div className="flex flex-wrap gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setStatuses((prev) => ({ ...prev, [type]: 'valid' }))}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          statuses[type] === 'valid'
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        Valid
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatuses((prev) => ({ ...prev, [type]: 'needs_correction' }))}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          statuses[type] === 'needs_correction'
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        Needs Correction
                      </button>
                    </div>
                  )}
                  {doc && statuses[type] === 'needs_correction' && (
                    <div className="mt-3">
                      <label htmlFor={`correction-note-${type}`} className="mb-1 block text-xs font-semibold text-red-700 dark:text-red-400">
                        What needs to be corrected <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        id={`correction-note-${type}`}
                        value={correctionNotes[type] ?? ''}
                        onChange={(e) => setCorrectionNotes((prev) => ({ ...prev, [type]: e.target.value }))}
                        rows={2}
                        maxLength={CORRECTION_NOTE_MAX}
                        placeholder="e.g. The photo is blurry. Please upload a clearer scan."
                        className="w-full rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        The parent sees this next to the document and in the email.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6">
            <label htmlFor="review-notes" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Review Notes (Internal)
            </label>
            <textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes regarding this application..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 dark:border-gray-800 p-6">
          {hasParentAccount && !alreadyHasStudent && (
            <button
              onClick={handleApproveAndCreateStudent}
              disabled={isSubmitting || !allValid}
              title={!allValid ? 'Mark all 4 documents as Valid first' : undefined}
              className="w-full rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? 'Working…' : 'Approve & Create Student Record'}
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingCorrections(true)}
              disabled={isSubmitting || !hasUploadedDocs || needsCorrectionTypes.length === 0 || !!correctionNoteProblem}
              title={
                needsCorrectionTypes.length === 0
                  ? 'Mark at least one document as Needs Correction first'
                  : (correctionNoteProblem ?? undefined)
              }
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Request Corrections
            </button>
            <button
              onClick={handleSaveReview}
              disabled={isSubmitting || !hasUploadedDocs}
              className="flex-1 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save Review'}
            </button>
          </div>
        </div>
      </Modal>

      <DocumentPreviewModal
        url={previewUrl}
        title={previewTitle}
        onClose={() => setPreviewUrl(null)}
      />

      {confirmingCorrections && (
        <ConfirmDialog
          tone="neutral"
          title="Request corrections from the parent?"
          description={`This emails ${application.parent_first_name} at ${application.parent_email} asking them to resubmit: ${needsCorrectionTypes.map((type) => documentShortLabels[type] ?? type).join(', ')}. Each document's note is included.`}
          confirmLabel="Yes, Send Request"
          isPending={isSubmitting}
          onConfirm={handleRequestCorrections}
          onCancel={() => setConfirmingCorrections(false)}
        />
      )}
    </>
  )
}
