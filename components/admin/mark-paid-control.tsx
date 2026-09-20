'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markPaymentPaidManually } from '@/app/admin/payments/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function MarkPaidControl({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [method, setMethod] = useState<'cash' | 'check'>('cash')
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      try {
        const result = await markPaymentPaidManually(paymentId, method)
        if (result?.error) {
          setError(result.error)
          setConfirming(false)
          return
        }
        setConfirming(false)
        router.refresh()
      } catch {
        setError('Something went wrong.')
        setConfirming(false)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as 'cash' | 'check')}
        className="rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-2 py-1.5 text-xs focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
      >
        <option value="cash">Cash</option>
        <option value="check">Check</option>
      </select>
      <button
        onClick={() => setConfirming(true)}
        className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-3 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
      >
        Mark Paid
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {confirming && (
        <ConfirmDialog
          title="Record this payment?"
          description={`This fee will be marked as paid via ${method}, recorded in the student's payment history.`}
          confirmLabel="Yes, Mark Paid"
          tone="neutral"
          isPending={isPending}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
