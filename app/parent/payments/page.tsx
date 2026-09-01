import { CreditCard } from 'lucide-react'

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Payments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View billing history and make payments toward tuition.</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
          <CreditCard className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">Payments aren&apos;t available yet</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This section is coming soon.</p>
      </div>
    </div>
  )
}
