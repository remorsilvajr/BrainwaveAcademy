'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle2, Clock, XCircle, FileText, ClipboardList, FileWarning } from 'lucide-react'
import { uploadRequirementDocument, getOwnDocumentSignedUrl } from '@/app/parent/requirements/actions'
import { documentOrder, documentShortLabels, documentDescriptions } from '@/lib/documents'
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal'
import { EmptyState } from '@/components/ui/empty-state'

type DocRow = { id: string; document_type: string; verification_status: string }
type EnrollmentRecord = {
  applicationId: string
  studentFirstName: string
  studentLastName: string
  documents: DocRow[]
}

// Vercel's serverless functions cap request bodies at 4.5MB regardless of
// this repo's own next.config.ts `experimental.serverActions.bodySizeLimit`
// (10mb) — see the same note on components/ui/avatar-editor.tsx. A large
// scanned document or a phone-camera photo of an ID/certificate used to
// sail past this upload with no feedback and hit that platform limit at
// the network layer, surfacing as a generic framework error (a minified
// React error like #441, or "An unexpected response was received from the
// server") instead of a normal caught message. Set to 4MB rather than the
// avatars bucket's stricter 2MB since the `documents` bucket itself has no
// file_size_limit — 4MB still leaves headroom under Vercel's 4.5MB cap.
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024

const statusMeta: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  valid: { label: 'Submitted', className: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
  pending: { label: 'Pending Review', className: 'text-amber-600 dark:text-amber-400', icon: Clock },
  needs_correction: { label: 'Needs Correction', className: 'text-red-600 dark:text-red-400', icon: XCircle },
  not_submitted: { label: 'Not Submitted', className: 'text-red-600 dark:text-red-400', icon: XCircle },
}

export function RequirementsChecklist({
  record,
  selectedElsewhereNotEligible,
  selectedElsewhereStatus,
}: {
  record: EnrollmentRecord | null
  selectedElsewhereNotEligible: boolean
  selectedElsewhereStatus?: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')

  if (!record) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Enrollment Requirements Checklist</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please submit the following documents to complete your child&apos;s enrollment for the
            upcoming academic year.
          </p>
        </div>

        {selectedElsewhereNotEligible && selectedElsewhereStatus === 'rejected' ? (
          <EmptyState
            icon={FileWarning}
            tone="error"
            title="Enrollment Request Not Approved"
            description="This enrollment request wasn't approved, so there's nothing to upload documents for. Check Enrollment Status for the reason, or start a new request if you'd like to try again."
            action={{ href: '/parent/enrollment-status', label: 'Check Enrollment Status' }}
            secondaryAction={{
              href: '/parent/enroll-a-student',
              label: 'Enroll A Student',
              prefix: 'Ready to try again?',
            }}
          />
        ) : selectedElsewhereNotEligible ? (
          <EmptyState
            icon={Clock}
            tone="warning"
            title="Waiting on Admin Approval"
            description="This enrollment request hasn't been approved yet. Once it is, document upload will open up here automatically — no need to check back constantly."
            action={{ href: '/parent/enrollment-status', label: 'Check Enrollment Status' }}
            secondaryAction={{
              href: '/parent/enroll-a-student',
              label: 'Enroll A Student',
              prefix: 'Enrolling another child in the meantime?',
            }}
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No Enrollment Application Yet"
            description="This checklist is where you'll upload your child's Birth Certificate, 2×2 ID Photo, Proof of Address, and a Guardian Valid ID once enrollment is underway. Start an application first and this page will fill in automatically."
            action={{ href: '/parent/enroll-a-student', label: 'Enroll A Student' }}
          />
        )}
      </div>
    )
  }

  const currentRecord = record
  const applicationId = currentRecord.applicationId

  function getDoc(type: string) {
    return currentRecord.documents.find((d) => d.document_type === type)
  }

  function getStatusKey(type: string) {
    const doc = getDoc(type)
    if (!doc) return 'not_submitted'
    return doc.verification_status
  }

  const validCount = documentOrder.filter((type) => getStatusKey(type) === 'valid').length
  const progressPercent = Math.round((validCount / documentOrder.length) * 100)

  function handleUploadClick(type: string) {
    fileInputs.current[type]?.click()
  }

  function handleFileChange(type: string, file: File | null) {
    if (!file || !applicationId) return
    if (file.size > MAX_DOCUMENT_BYTES) {
      setErrorMessage('That file is too large — please choose one under 4MB.')
      return
    }
    setErrorMessage('')
    const formData = new FormData()
    formData.append('file', file)
    startTransition(async () => {
      try {
        await uploadRequirementDocument(applicationId, type, formData)
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      }
    })
  }

  async function handleViewDocument(type: string) {
    const doc = getDoc(type)
    if (!doc) return
    try {
      const url = await getOwnDocumentSignedUrl(doc.id)
      setPreviewTitle(documentShortLabels[type] ?? 'Document')
      setPreviewUrl(url)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not open that document.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Enrollment Requirements Checklist</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please submit the following documents to complete your child&apos;s enrollment for the
          upcoming academic year.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Verification Progress</h3>
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {progressPercent}% Complete
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-sky-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {validCount} of {documentOrder.length} requirements submitted successfully
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <div className="space-y-4">
        {documentOrder.map((type) => {
          const statusKey = getStatusKey(type)
          const meta = statusMeta[statusKey] ?? statusMeta.not_submitted
          const StatusIcon = meta.icon
          const canView = statusKey === 'valid' || statusKey === 'pending'

          return (
            <div
              key={type}
              className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{documentShortLabels[type]}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{documentDescriptions[type]}</p>
                  <p className={`mt-1 flex items-center gap-1 text-xs font-semibold uppercase ${meta.className}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {meta.label}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canView && (
                  <button
                    onClick={() => handleViewDocument(type)}
                    className="rounded-lg border border-[#0b1b62] dark:border-indigo-300 px-4 py-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62]/5"
                  >
                    View Document
                  </button>
                )}
                {statusKey !== 'valid' && (
                  <>
                    <input
                      ref={(el) => {
                        fileInputs.current[type] = el
                      }}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileChange(type, e.target.files?.[0] ?? null)}
                    />
                    <button
                      onClick={() => handleUploadClick(type)}
                      disabled={isPending || !applicationId}
                      className="rounded-lg bg-[#e6007e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
                    >
                      Upload File
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <DocumentPreviewModal
        url={previewUrl}
        title={previewTitle}
        onClose={() => setPreviewUrl(null)}
      />
    </div>
  )
}
