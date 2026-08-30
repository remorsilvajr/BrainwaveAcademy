'use client'

import { useState } from 'react'
import { ApplicationReviewSlideover } from '@/components/admin/application-review-slideover'
import { isToday } from '@/lib/format'
import { documentOrder } from '@/lib/documents'

type DocRow = { document_type: string; file_url: string; verification_status: string }

type Application = {
  id: string
  application_ref: string
  status: string
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

type Tab = 'all' | 'pending' | 'corrections' | 'approvedToday'

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [selected, setSelected] = useState<Application | null>(null)

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending_review').length,
    corrections: applications.filter((a) => a.status === 'needs_correction').length,
    approvedToday: applications.filter(
      (a) => a.status === 'approved' && a.reviewed_at && isToday(a.reviewed_at)
    ).length,
  }

  const filtered = applications.filter((app) => {
    if (tab === 'pending') return app.status === 'pending_review'
    if (tab === 'corrections') return app.status === 'needs_correction'
    if (tab === 'approvedToday') return app.status === 'approved' && app.reviewed_at && isToday(app.reviewed_at)
    return true
  })

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All Applications', count: counts.all },
    { key: 'pending', label: 'Pending Document Review', count: counts.pending },
    { key: 'corrections', label: 'Needs Correction', count: counts.corrections },
    { key: 'approvedToday', label: 'Approved Today', count: counts.approvedToday },
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
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        app.status === 'approved'
                          ? 'bg-green-50 text-green-700'
                          : app.status === 'rejected'
                            ? 'bg-red-50 text-red-700'
                            : app.status === 'needs_correction'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {app.status.replace(/_/g, ' ')}
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
