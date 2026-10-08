'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteFee } from '@/app/admin/payments/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FEE_REASON_MAX, validateFeeReason } from '@/lib/fees'
import { formatCurrency } from '@/lib/format'

// Super admin only, inside the fee's Manage/Details window: delete a fee that
// has nothing paid toward it. It moves to Deleted Items, where it can be restored.
export function DeleteFeeSection({
  fee,
  onDeleted,
}: {
  fee: { id: string; amount: number; amount_paid: number; studentName: string; description: string | null; fee_type: string }
  onDeleted: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const title = fee.description || `${fee.fee_type.charAt(0).toUpperCase()}${fee.fee_type.slice(1)} fee`

  if (fee.amount_paid > 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Delete is not available: {formatCurrency(fee.amount_paid)} has been paid toward this fee. Reverse the payment first.
      </p>
    )
  }

  async function handleConfirm() {
    setIsWorking(true)
    try {
      const result = await deleteFee(fee.id, reason)
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
        return
      }
      router.refresh()
      onDeleted()
    } catch {
      setError('Something went wrong. Please try again.')
      setConfirming(false)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="rounded-xl border border-red-200 p-4 dark:border-red-900">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Fee
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The fee is removed from every list and moved to Deleted Items, where it can be restored. The family is notified.
          </p>
          <div>
            <label htmlFor="delete-fee-reason" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="delete-fee-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={FEE_REASON_MAX}
              rows={2}
              placeholder="For example: added twice by mistake."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100"
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError('')
              }}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const problem = validateFeeReason(reason)
                if (problem) {
                  setError(problem)
                  return
                }
                setError('')
                setConfirming(true)
              }}
              className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Delete Fee
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete this fee?"
          description={`${title} (${formatCurrency(fee.amount)}) for ${fee.studentName} will move to Deleted Items.`}
          confirmLabel="Yes, Delete"
          tone="danger"
          isPending={isWorking}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
