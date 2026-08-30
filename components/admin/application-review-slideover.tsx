'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, X } from 'lucide-react'
import { approveApplication } from '@/app/admin/enroll-a-student/actions'
import { saveDocumentReview, requestCorrections, getSignedDocumentUrl } from '@/app/admin/applications/actions'
import { calculateAge, formatDateLong, formatStatus } from '@/lib/format'
import { documentLabels, documentOrder } from '@/lib/documents'

type DocRow = { document_type: string; file_url: string; verification_status: string }

type Application = {
  id: string
  application_ref: string
  status: string
  reviewed_at: string | null
  review_notes: string | null
  student_first_name: string
  student_last_name: string
  student_dob: string
  parent_first_name: string
  parent_last_name: string
  parent_relationship: string
  parent_contact_number: string
  parent_email: string
  documents: DocRow[]
}

type DocStatus = 'valid' | 'needs_correction' | 'pending'

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

export function ApplicationReviewSlideover({
  application,
  onClose,
}: {
  application: Application
  onClose: () => void
}) {
  const router = useRouter()
  const studentName = `${application.student_first_name} ${application.student_last_name}`
  const alreadyDecided = application.status === 'approved' || application.status === 'rejected'

  const [statuses, setStatuses] = useState<Record<string, DocStatus>>(() => {
    const initial: Record<string, DocStatus> = {}
    for (const type of documentOrder) {
      const doc = application.documents.find((d) => d.document_type === type)
      initial[type] = (doc?.verification_status as DocStatus) ?? 'pending'
    }
    return initial
  })
  const [notes, setNotes] = useState(application.review_notes ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<'approved' | 'corrections' | 'saved' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const allValid = documentOrder.every((type) => statuses[type] === 'valid')

  async function handleViewDocument(type: string) {
    const doc = application.documents.find((d) => d.document_type === type)
    if (!doc) return
    try {
      const url = await getSignedDocumentUrl(doc.file_url)
      window.open(url, '_blank')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not open that document.')
    }
  }

  async function handleSaveDraft() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await saveDocumentReview(application.id, statuses, notes)
      setResult('saved')
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRequestCorrections() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await requestCorrections(application.id, statuses, notes)
      setResult('corrections')
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleApprove() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await saveDocumentReview(application.id, statuses, notes)
      await approveApplication(application.id)
      setResult('approved')
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Application Review</h2>
            <p className="text-sm text-gray-500">
              {application.application_ref} • {studentName}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {result ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="font-medium text-green-800">
                {result === 'approved' && `Approved! ${application.parent_first_name} has been notified by email.`}
                {result === 'corrections' && 'Corrections requested. The application is now marked "Needs Correction".'}
                {result === 'saved' && 'Draft saved.'}
              </p>
            </div>
          ) : (
            <>
              {alreadyDecided && (
                <div
                  className={`mb-4 rounded-lg p-3 text-sm font-medium ${
                    application.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  This application was {formatStatus(application.status).toLowerCase()}
                  {application.reviewed_at ? ` on ${formatDateLong(application.reviewed_at)}` : ''}.
                </div>
              )}

              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Applicant Summary
              </p>
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4">
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

              <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-gray-400">
                Document Verification
              </p>
              <div className="space-y-3">
                {documentOrder.map((type) => {
                  const doc = application.documents.find((d) => d.document_type === type)
                  return (
                    <div key={type} className="rounded-xl border border-gray-200 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{documentLabels[type]}</p>
                      </div>
                      {doc ? (
                        <button
                          onClick={() => handleViewDocument(type)}
                          className="mb-3 text-sm text-[#00a3e0] underline"
                        >
                          View Document
                        </button>
                      ) : (
                        <p className="mb-3 text-sm text-gray-400">Not uploaded</p>
                      )}
                      {!alreadyDecided && (
                        <div className="flex gap-4 rounded-lg bg-gray-50 px-3 py-2">
                          <label className="flex items-center gap-1.5 text-sm text-gray-700">
                            <input
                              type="radio"
                              name={`status-${type}`}
                              checked={statuses[type] === 'valid'}
                              onChange={() => setStatuses((prev) => ({ ...prev, [type]: 'valid' }))}
                            />
                            Valid
                          </label>
                          <label className="flex items-center gap-1.5 text-sm text-gray-700">
                            <input
                              type="radio"
                              name={`status-${type}`}
                              checked={statuses[type] === 'needs_correction'}
                              onChange={() =>
                                setStatuses((prev) => ({ ...prev, [type]: 'needs_correction' }))
                              }
                            />
                            Needs Correction
                          </label>
                        </div>
                      )}
                      {alreadyDecided && (
                        <p className="text-xs capitalize text-gray-500">{statuses[type].replace('_', ' ')}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {!alreadyDecided && (
                <div className="mt-6">
                  <label htmlFor="review-notes" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                    Review Notes (Internal)
                  </label>
                  <textarea
                    id="review-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes regarding this application..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
                  />
                </div>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 p-6">
          {result || alreadyDecided ? (
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={handleApprove}
                disabled={isSubmitting || !allValid}
                title={!allValid ? 'Mark all 4 documents as Valid first' : undefined}
                className="w-full rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? 'Working…' : 'Approve & Create Student Record'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleRequestCorrections}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Request Corrections
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-[#00a3e0] hover:bg-sky-50 disabled:opacity-60"
                >
                  Save Draft
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
