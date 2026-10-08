'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markPaymentPaidManually } from '@/app/admin/payments/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrency } from '@/lib/format'

// Amount defaults to the full remaining balance (the old whole-fee-only
// behavior); admin can lower it to record a partial cash payment instead.
export function MarkPaidControl({ paymentId, remainingBalance }: { paymentId: string; remainingBalance: number }) {
  const router = useRouter()
  const method = 'cash'
  const [amount, setAmount] = useState(String(remainingBalance))
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const parsedAmount = Number(amount)
  const isFull = parsedAmount >= remainingBalance
  const isValid = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= remainingBalance

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      try {
        const result = await markPaymentPaidManually(paymentId, method, parsedAmount)
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">₱</span>
        <input
          type="number"
          min="0"
          max={remainingBalance}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100"
        />
      </div>
      <button
        onClick={() => setConfirming(true)}
        disabled={!isValid}
        className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-3 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Mark Paid
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {confirming && (
        <ConfirmDialog
          title="Record this payment?"
          description={`${formatCurrency(parsedAmount)} of this fee will be marked as paid in cash, recorded in the student's payment history${
            isFull ? '' : `, leaving ${formatCurrency(remainingBalance - parsedAmount)} still owed`
          }.`}
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
