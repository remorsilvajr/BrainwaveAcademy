'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { calculateAge, formatDateLong } from '@/lib/format'
import { documentLabels, documentOrder } from '@/lib/documents'
import { getSignedDocumentUrl } from '@/app/admin/applications/actions'

type Guardian = {
  name: string
  relationship: string | null
  phone: string | null
  email: string | null
}

type DocRow = { document_type: string; file_url: string; verification_status: string }

type Student = {
  id: string
  student_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  guardians: Guardian[]
  documents: DocRow[]
}

type Tab = 'personal' | 'guardian' | 'documents'

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

export function StudentRecordSlideover({ student, onClose }: { student: Student; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('personal')
  const [errorMessage, setErrorMessage] = useState('')

  const fullName = `${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''} ${student.last_name}`

  async function handleViewDocument(path: string) {
    try {
      const url = await getSignedDocumentUrl(path)
      window.open(url, '_blank')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not open that document.')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'personal', label: 'Personal Details' },
    { key: 'guardian', label: 'Guardian Info' },
    { key: 'documents', label: 'Documents' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{student.first_name} {student.last_name}</h2>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium uppercase text-green-700">
                  {student.enrollment_status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Student ID: {student.student_id ?? '—'}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-4 border-b border-gray-100">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                  tab === t.key ? 'border-[#e6007e] text-[#e6007e]' : 'border-transparent text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'personal' && (
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Legal Full Name" value={fullName} />
              <InfoField
                label="Date of Birth (Age)"
                value={`${formatDateLong(student.date_of_birth)} (${calculateAge(student.date_of_birth)}y)`}
              />
              <InfoField label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />
            </div>
          )}

          {tab === 'guardian' && (
            <div className="space-y-3">
              {student.guardians.length > 0 ? (
                student.guardians.map((g, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-4">
                    <p className="font-medium text-gray-900">
                      {g.name} {g.relationship && <span className="text-xs text-gray-500">({g.relationship})</span>}
                    </p>
                    {g.email && <p className="mt-1 text-sm text-gray-600">{g.email}</p>}
                    {g.phone && <p className="text-sm text-gray-600">{g.phone}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No linked guardian on file.</p>
              )}
            </div>
          )}

          {tab === 'documents' && (
            <div className="space-y-3">
              {documentOrder.map((type) => {
                const doc = student.documents.find((d) => d.document_type === type)
                return (
                  <div key={type} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{documentLabels[type]}</p>
                      <p className="text-xs capitalize text-gray-500">
                        {doc ? doc.verification_status.replace('_', ' ') : 'Not on file'}
                      </p>
                    </div>
                    {doc && (
                      <button
                        onClick={() => handleViewDocument(doc.file_url)}
                        className="text-sm font-medium text-[#0b1b62] underline"
                      >
                        View
                      </button>
                    )}
                  </div>
                )
              })}
              {errorMessage && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close Record
          </button>
        </div>
      </div>
    </div>
  )
}
