import { createClient } from '@/lib/supabase/server'
import { approveApplication } from './actions'

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .order('submitted_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Applications</h1>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">Application Ref</th>
            <th className="p-3">Student Name</th>
            <th className="p-3">Parent / Guardian</th>
            <th className="p-3">Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {applications && applications.length > 0 ? (
            applications.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-3">{app.application_ref}</td>
                <td className="p-3">
                  {app.student_first_name} {app.student_last_name}
                </td>
                <td className="p-3">
                  {app.parent_first_name} {app.parent_last_name}
                </td>
                <td className="p-3 capitalize">{app.status.replace(/_/g, ' ')}</td>
                <td className="p-3">
                  {app.status === 'pending_review' && (
                    <form action={approveApplication.bind(null, app.id)}>
                      <button type="submit" className="text-sm font-medium text-[#0b1b62] underline">
                        Approve
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-500">
                No applications yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
