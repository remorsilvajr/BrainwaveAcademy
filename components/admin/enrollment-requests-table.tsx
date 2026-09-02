'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EnrollmentRequestModal } from '@/components/admin/enrollment-request-modal'
import { calculateAge, formatStatus } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

type Application = {
  id: string
  application_ref: string
  submitted_at: string
  status: string
  reviewed_at: string | null
  student_first_name: string
  student_middle_name: string | null
  student_last_name: string
  student_dob: string
  student_gender: string
  parent_first_name: string
  parent_middle_name: string | null
  parent_last_name: string
  parent_dob: string
  parent_relationship: string
  parent_gender: string | null
  parent_contact_number: string
  parent_email: string
}

type Tab = 'all' | 'pending_review' | 'approved' | 'rejected'

export function EnrollmentRequestsTable({ applications }: { applications: Application[] }) {
  // See students-table.tsx for why this is derived rather than its own
  // synced state — also matters here since the realtime subscription below
  // triggers router.refresh() on any change.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (applications.find((a) => a.id === selectedId) ?? null) : null
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const router = useRouter()

  const counts = {
    all: applications.length,
    pending_review: applications.filter((a) => a.status === 'pending_review').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }

  const filtered = (tab === 'all' ? applications : applications.filter((a) => a.status === tab)).filter(
    (app) => {
      if (!search.trim()) return true
      const term = search.toLowerCase()
      return (
        `${app.student_first_name} ${app.student_last_name}`.toLowerCase().includes(term) ||
        `${app.parent_first_name} ${app.parent_last_name}`.toLowerCase().includes(term) ||
        app.parent_email.toLowerCase().includes(term) ||
        app.application_ref.toLowerCase().includes(term)
      )
    }
  )

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(
    filtered,
    `${tab}|${search}`
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending_review', label: 'Pending', count: counts.pending_review },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ]

  // Live updates: re-fetch this route's data whenever any row in
  // `applications` changes (a new public submission, or a status change
  // from another admin session) — no manual refresh needed.
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('admin-applications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

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
                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
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
              <th className="p-4 font-medium">Submission Date &amp; Ref</th>
              <th className="p-4 font-medium">Student Info</th>
              <th className="p-4 font-medium">Parent / Guardian</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.length > 0 ? (
              pageItems.map((app) => (
                <tr key={app.id} className="align-top">
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(app.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date(app.submitted_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{app.application_ref}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-[#0b1b62] dark:text-indigo-300">
                      {app.student_first_name} {app.student_last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Age {calculateAge(app.student_dob)}</p>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    {app.parent_first_name} {app.parent_last_name}
                  </td>
                  <td className="p-4">
                    <p className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {app.parent_email}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {app.parent_contact_number}
                    </p>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        app.status === 'approved'
                          ? 'bg-green-50 dark:bg-green-950/30 text-green-700'
                          : app.status === 'rejected'
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {formatStatus(app.status)}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelectedId(app.id)}
                      className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-4 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                    >
                      View Submission
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500">
                  No enrollment requests in this view.
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
        <EnrollmentRequestModal application={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
