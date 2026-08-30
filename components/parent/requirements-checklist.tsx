'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle2, Clock, XCircle, FileText } from 'lucide-react'
import { uploadRequirementDocument, getOwnDocumentSignedUrl } from '@/app/parent/requirements/actions'
import { documentOrder, documentShortLabels, documentDescriptions } from '@/lib/documents'

type DocRow = { id: string; document_type: string; verification_status: string }
type EnrollmentRecord = {
  applicationId: string
  studentFirstName: string
  studentLastName: string
  documents: DocRow[]
}

const statusMeta: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  valid: { label: 'Submitted', className: 'text-green-600', icon: CheckCircle2 },
  pending: { label: 'Pending Review', className: 'text-amber-600', icon: Clock },
  needs_correction: { label: 'Needs Correction', className: 'text-red-600', icon: XCircle },
  not_submitted: { label: 'Not Submitted', className: 'text-red-600', icon: XCircle },
}

export function RequirementsChecklist({ records }: { records: EnrollmentRecord[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  if (records.length === 0) {
    return (
      <p className="text-gray-500">
        No enrollment application found for your account yet. If you just received your login
        details, this may take a moment — otherwise, contact the school office.
      </p>
    )
  }

  const record = records[selectedIndex]
  const applicationId = record.applicationId

  function getDoc(type: string) {
    return record.documents.find((d) => d.document_type === type)
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
      window.open(url, '_blank')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not open that document.')
    }
  }

  return (
    <div className="space-y-6">
      {records.length > 1 && (
        <div className="max-w-xs">
          <label className="mb-1 block text-xs font-medium text-gray-500">Student</label>
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
          >
            {records.map((r, i) => (
              <option key={r.applicationId} value={i}>
                {r.studentFirstName} {r.studentLastName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-[#0b1b62]">Enrollment Requirements Checklist</h2>
        <p className="mt-1 text-sm text-gray-500">
          Please submit the following documents to complete your child&apos;s enrollment for the
          upcoming academic year.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Verification Progress</h3>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            {progressPercent}% Complete
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-sky-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {validCount} of {documentOrder.length} requirements submitted successfully
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
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
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-gray-100 p-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{documentShortLabels[type]}</p>
                  <p className="text-sm text-gray-500">{documentDescriptions[type]}</p>
                  <p className={`mt-1 flex items-center gap-1 text-xs font-semibold uppercase ${meta.className}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {meta.label}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canView && (
                  <button
                    onClick={() => handleViewDocument(type)}
                    className="rounded-lg border border-[#0b1b62] px-4 py-2 text-sm font-semibold text-[#0b1b62] hover:bg-[#0b1b62]/5"
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
    </div>
  )
}
