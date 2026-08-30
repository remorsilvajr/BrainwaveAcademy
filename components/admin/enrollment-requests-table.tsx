'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EnrollmentRequestSlideover } from '@/components/admin/enrollment-request-slideover'
import { calculateAge, formatStatus } from '@/lib/format'

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
  parent_contact_number: string
  parent_email: string
}

type Tab = 'all' | 'pending_review' | 'approved' | 'rejected'

export function EnrollmentRequestsTable({ applications }: { applications: Application[] }) {
  const [selected, setSelected] = useState<Application | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const router = useRouter()

  const counts = {
    all: applications.length,
    pending_review: applications.filter((a) => a.status === 'pending_review').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }

  const filtered = tab === 'all' ? applications : applications.filter((a) => a.status === tab)

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
              <th className="p-4 font-medium">Submission Date &amp; Ref</th>
              <th className="p-4 font-medium">Student Info</th>
              <th className="p-4 font-medium">Parent / Guardian</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((app) => (
                <tr key={app.id} className="align-top">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">
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
                    <p className="text-xs text-gray-400">{app.application_ref}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-[#0b1b62]">
                      {app.student_first_name} {app.student_last_name}
                    </p>
                    <p className="text-xs text-gray-500">Age {calculateAge(app.student_dob)}</p>
                  </td>
                  <td className="p-4 text-gray-700">
                    {app.parent_first_name} {app.parent_last_name}
                  </td>
                  <td className="p-4">
                    <p className="flex items-center gap-1.5 text-gray-600">
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {app.parent_email}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-gray-600">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {app.parent_contact_number}
                    </p>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        app.status === 'approved'
                          ? 'bg-green-50 text-green-700'
                          : app.status === 'rejected'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {formatStatus(app.status)}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelected(app)}
                      className="text-sm font-semibold text-[#0b1b62] underline"
                    >
                      View Submission
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No enrollment requests in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <EnrollmentRequestSlideover application={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
