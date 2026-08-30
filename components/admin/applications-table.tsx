'use client'

import { useState } from 'react'
import { ApplicationReviewSlideover } from '@/components/admin/application-review-slideover'
import { documentOrder } from '@/lib/documents'

type DocRow = { document_type: string; file_url: string; verification_status: string }

type Application = {
  id: string
  application_ref: string
  created_parent_id: string | null
  created_student_id: string | null
  reviewed_at: string | null
  review_notes: string | null
  submitted_at: string
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

type Tab = 'all' | 'pending' | 'corrections' | 'completed'

// Document-verification progress, not `applications.status` — every row
// here already has status 'approved' (that's the enrollment *request*
// outcome, decided back in Enroll A Student), so it's constant within this
// page and doesn't distinguish anything. What actually varies here is
// whether documents still need review, need correction, or are all in and
// the student record has been created.
function progressOf(app: Application): 'corrections' | 'completed' | 'pending' {
  if (app.created_student_id) return 'completed'
  if (app.documents.some((d) => d.verification_status === 'needs_correction')) return 'corrections'
  return 'pending'
}

const progressMeta: Record<'corrections' | 'completed' | 'pending', { label: string; className: string }> = {
  pending: { label: 'Pending Document Review', className: 'bg-amber-50 text-amber-700' },
  corrections: { label: 'Needs Correction', className: 'bg-orange-50 text-orange-700' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700' },
}

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [selected, setSelected] = useState<Application | null>(null)

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => progressOf(a) === 'pending').length,
    corrections: applications.filter((a) => progressOf(a) === 'corrections').length,
    completed: applications.filter((a) => progressOf(a) === 'completed').length,
  }

  const filtered = applications.filter((app) => {
    if (tab === 'all') return true
    return progressOf(app) === tab
  })

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All Applications', count: counts.all },
    { key: 'pending', label: 'Pending Document Review', count: counts.pending },
    { key: 'corrections', label: 'Needs Correction', count: counts.corrections },
    { key: 'completed', label: 'Completed', count: counts.completed },
  ]

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'bg-[#0b1b62] text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-4 font-medium">Application Ref</th>
              <th className="p-4 font-medium">Student Name</th>
              <th className="p-4 font-medium">Parent/Guardian</th>
              <th className="p-4 font-medium">Documents</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((app) => (
                <tr key={app.id}>
                  <td className="p-4 font-medium text-[#0b1b62]">{app.application_ref}</td>
                  <td className="p-4 text-gray-900">
                    {app.student_first_name} {app.student_last_name}
                  </td>
                  <td className="p-4 text-gray-700">
                    {app.parent_first_name} {app.parent_last_name}
                  </td>
                  <td className="p-4 text-gray-700">
                    {app.documents.length}/{documentOrder.length} Uploaded
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${progressMeta[progressOf(app)].className}`}
                    >
                      {progressMeta[progressOf(app)].label}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelected(app)}
                      className="rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d]"
                    >
                      Review Application
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No applications in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ApplicationReviewSlideover application={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
