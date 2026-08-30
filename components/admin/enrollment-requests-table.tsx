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

export function EnrollmentRequestsTable({ applications }: { applications: Application[] }) {
  const [selected, setSelected] = useState<Application | null>(null)
  const router = useRouter()

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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
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
            {applications.length > 0 ? (
              applications.map((app) => (
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
                  No enrollment requests yet.
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
