'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2, X } from 'lucide-react'
import { reversePayment } from '@/app/admin/payments/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/format'
import { FEE_REASON_MAX, validateFeeReason, type FeeAdjustment, feeAdjustmentLabels } from '@/lib/fees'
import { formatDateLong } from '@/lib/format'

export type ReversibleFee = {
  id: string
  studentName: string
  description: string | null
  fee_type: string
  amount: number
  payment_method: string | null
  receipt_ref: string | null
}

// Undo a payment that was recorded by mistake. A wallet payment is refunded to
// the parent's wallet by the database in the same transaction; a cash payment
// is only marked unpaid, since the cash itself is handled outside the app.
export function ReversePaymentModal({
  fee,
  adjustments,
  onClose,
}: {
  fee: ReversibleFee
  adjustments: FeeAdjustment[]
  onClose: () => void
}) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const isWallet = fee.payment_method === 'wallet'
  const title = fee.description || `${fee.fee_type.charAt(0).toUpperCase()}${fee.fee_type.slice(1)} fee`

  function askConfirm() {
    setError('')
    const problem = validateFeeReason(reason)
    if (problem) {
      setError(problem)
      return
    }
    setConfirming(true)
  }

  async function handleConfirm() {
    setIsWorking(true)
    try {
      const result = await reversePayment(fee.id, reason)
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setConfirming(false)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <>
      <Modal onClose={onClose} maxWidth="lg">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6 dark:border-gray-800">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#0b1b62] dark:text-indigo-300">
              <Undo2 className="h-5 w-5" />
              Reverse payment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {title} · {fee.studentName}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 dark:text-gray-500">Amount paid</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(fee.amount)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 dark:text-gray-500">Paid by</p>
              <p className="text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">
                {fee.payment_method ?? 'unknown'}
                {fee.receipt_ref ? <span className="ml-2 text-xs font-normal text-gray-400">{fee.receipt_ref}</span> : null}
              </p>
            </div>
          </div>

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {isWallet
              ? `The fee goes back to unpaid and ${formatCurrency(fee.amount)} is returned to the parent's wallet, with an entry in Wallet Activity.`
              : 'The fee goes back to unpaid. The cash itself is not handled here, so return it to the family yourself if that is needed.'}
          </p>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

          <div>
            <label htmlFor="reverse-reason" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reverse-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={FEE_REASON_MAX}
              placeholder="For example: recorded against the wrong student."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400"
            />
          </div>

          {adjustments.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
              {adjustments.map((a) => (
                <li key={a.id} className="px-3 py-2 text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{feeAdjustmentLabels[a.action]}</span>
                  <span className="ml-2 text-xs text-gray-400">{formatDateLong(a.created_at)}</span>
                  <p className="text-gray-600 dark:text-gray-400">{a.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-100 p-6 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={askConfirm}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Reverse payment
          </button>
        </div>
      </Modal>

      {confirming && (
        <ConfirmDialog
          title="Reverse this payment?"
          description={`${formatCurrency(fee.amount)} for ${fee.studentName} will be marked unpaid${isWallet ? ' and refunded to the wallet' : ''}.`}
          confirmLabel="Yes, Reverse"
          tone="danger"
          isPending={isWorking}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}
