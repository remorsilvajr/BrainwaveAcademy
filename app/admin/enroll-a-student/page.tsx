import { Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { approveApplication } from './actions'

function calculateAge(dob: string) {
  const birth = new Date(dob)
  const diffMs = Date.now() - birth.getTime()
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000))
}

function isToday(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export default async function EnrollAStudentPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('*')
    .order('submitted_at', { ascending: false })

  const applications = data ?? []
  const pendingCount = applications.filter((a) => a.status === 'pending_review').length
  const approvedTodayCount = applications.filter(
    (a) => a.status === 'approved' && a.reviewed_at && isToday(a.reviewed_at)
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Landing Page Enrollment Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review light enrollment submissions from the public website, approve students, and
          automatically trigger account setup emails.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-medium text-pink-700">
          New Requests: {pendingCount}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
          Approved Today: {approvedTodayCount}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-4 font-medium">Submission Date &amp; Ref</th>
              <th className="p-4 font-medium">Student Info</th>
              <th className="p-4 font-medium">Parent / Guardian</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium"></th>
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
                  <td className="p-4 capitalize text-gray-700">{app.status.replace(/_/g, ' ')}</td>
                  <td className="p-4">
                    {app.status === 'pending_review' && (
                      <form action={approveApplication.bind(null, app.id)}>
                        <button
                          type="submit"
                          className="rounded-full bg-[#e6007e] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#c9006e]"
                        >
                          Approve
                        </button>
                      </form>
                    )}
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
    </div>
  )
}
