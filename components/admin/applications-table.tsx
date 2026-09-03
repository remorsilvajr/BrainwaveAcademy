'use client'

import { useState } from 'react'
import { ApplicationReviewModal } from '@/components/admin/application-review-modal'
import { documentOrder } from '@/lib/documents'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

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
// outcome, decided back in Enrollment Requests), so it's constant within this
// page and doesn't distinguish anything. What actually varies here is
// whether documents still need review, need correction, or are all in and
// the student record has been created.
function progressOf(app: Application): 'corrections' | 'completed' | 'pending' {
  if (app.created_student_id) return 'completed'
  if (app.documents.some((d) => d.verification_status === 'needs_correction')) return 'corrections'
  return 'pending'
}

const progressMeta: Record<'corrections' | 'completed' | 'pending', { label: string; className: string }> = {
  pending: { label: 'Pending Document Review', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
  corrections: { label: 'Needs Correction', className: 'bg-orange-50 text-orange-700' },
  completed: { label: 'Completed', className: 'bg-green-50 dark:bg-green-950/30 text-green-700' },
}

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  // See students-table.tsx for why this is derived rather than its own
  // synced state.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (applications.find((a) => a.id === selectedId) ?? null) : null

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => progressOf(a) === 'pending').length,
    corrections: applications.filter((a) => progressOf(a) === 'corrections').length,
    completed: applications.filter((a) => progressOf(a) === 'completed').length,
  }

  const filtered = applications.filter((app) => {
    if (tab !== 'all' && progressOf(app) !== tab) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      `${app.student_first_name} ${app.student_last_name}`.toLowerCase().includes(term) ||
      `${app.parent_first_name} ${app.parent_last_name}`.toLowerCase().includes(term) ||
      app.parent_email.toLowerCase().includes(term) ||
      app.application_ref.toLowerCase().includes(term)
    )
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    filtered,
    `${tab}|${search}`
  )

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
                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Student name, parent name, email, or reference #"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400">
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
            {pageItems.length > 0 ? (
              pageItems.map((app) => (
                <tr
                  key={app.id}
                  onDoubleClick={() => setSelectedId(app.id)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <td className="p-4 font-medium text-[#0b1b62] dark:text-indigo-300">{app.application_ref}</td>
                  <td className="p-4 text-gray-900 dark:text-gray-100">
                    {app.student_first_name} {app.student_last_name}
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    {app.parent_first_name} {app.parent_last_name}
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
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
                      onClick={() => setSelectedId(app.id)}
                      className="rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d]"
                    >
                      Review Application
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500">
                  No applications in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {selected && (
        <ApplicationReviewModal application={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
