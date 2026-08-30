import { AlertTriangle, Mail, UserPlus } from 'lucide-react'

// TODO: every number and row on this page is still static demo data.
// Wiring this to real Supabase queries (pending application counts,
// active enrollment, payments, feedback) is a separate follow-up task.

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Administrator Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Real-time summary of school operations, pending approvals, recent payments, and
          feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-amber-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending Applications</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">14</p>
          <p className="mt-1 text-xs text-gray-400">Awaiting review &amp; document validation</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-green-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active Student Enrollment</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">128</p>
          <p className="mt-1 text-xs text-gray-400">Across Nursery, Pre-K, and ITED</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-red-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unresolved Feedback</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">3</p>
          <p className="mt-1 text-xs text-gray-400">Parent inquiries needing response</p>
        </div>
        <div className="rounded-xl border border-gray-200 border-l-4 border-l-sky-400 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Collections Today</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">₱48,500.00</p>
          <p className="mt-1 text-xs text-gray-400">6 transactions completed today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#0b1b62]">Recent Financial Transactions</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400">
              <tr>
                <th className="pb-2 font-medium">Ref # / Date</th>
                <th className="pb-2 font-medium">Payer / Student</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 align-top">
                  TXN-9021
                  <br />
                  <span className="text-xs text-gray-400">Today, 10:42 AM</span>
                </td>
                <td className="py-2 align-top">
                  Maria Santos
                  <br />
                  <span className="text-xs text-gray-400">Leo Santos (Nursery)</span>
                </td>
                <td className="py-2 align-top">GCash</td>
                <td className="py-2 align-top">₱12,500.00</td>
                <td className="py-2 align-top">
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                    Verified
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2 align-top">
                  TXN-9020
                  <br />
                  <span className="text-xs text-gray-400">Today, 09:15 AM</span>
                </td>
                <td className="py-2 align-top">
                  Juan Dela Cruz
                  <br />
                  <span className="text-xs text-gray-400">Anna Dela Cruz (Pre-K)</span>
                </td>
                <td className="py-2 align-top">BDO Transfer</td>
                <td className="py-2 align-top">₱8,000.00</td>
                <td className="py-2 align-top">
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                    Verified
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#0b1b62]">Priority Actions &amp; Feedback Log</h2>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3">
              <div className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Mrs. Santos</p>
                  <p className="text-xs text-gray-500">Question regarding nursery school supplies list</p>
                </div>
              </div>
              <button className="shrink-0 rounded border px-3 py-1 text-xs font-medium">Reply</button>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">System Flag</p>
                  <p className="text-xs text-gray-500">
                    2 new student health records uploaded with severe allergy notes
                  </p>
                </div>
              </div>
              <button className="shrink-0 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white">
                Review
              </button>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3">
              <div className="flex gap-2">
                <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Request</p>
                  <p className="text-xs text-gray-500">1 new teacher profile created</p>
                </div>
              </div>
              <button className="shrink-0 rounded border px-3 py-1 text-xs font-medium">Manage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
