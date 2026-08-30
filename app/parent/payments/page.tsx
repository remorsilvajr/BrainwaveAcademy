import { CreditCard } from 'lucide-react'

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">View billing history and make payments toward tuition.</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <CreditCard className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-gray-900">Payments aren&apos;t available yet</p>
        <p className="mt-1 text-sm text-gray-500">This section is coming soon.</p>
      </div>
    </div>
  )
}
