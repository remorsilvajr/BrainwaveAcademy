'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/format'
import { adjustWalletBalance } from '@/app/admin/payments/actions'

export function AdjustWalletModal({
  parentId,
  parentName,
  currentBalance,
  onClose,
}: {
  parentId: string
  parentName: string
  currentBalance: number
  onClose: () => void
}) {
  const router = useRouter()
  const [direction, setDirection] = useState<'add' | 'deduct'>('add')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setError('')
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    setIsSaving(true)
    try {
      const result = await adjustWalletBalance(parentId, direction === 'add' ? parsed : -parsed, note)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="md">
      <div className="border-b border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Adjust Wallet</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {parentName}, current balance {formatCurrency(currentBalance)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {success ? (
          <p className="rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            Wallet updated.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('add')}
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  direction === 'add'
                    ? 'border-green-600 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-950/30 dark:text-green-400'
                    : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Add Funds
              </button>
              <button
                type="button"
                onClick={() => setDirection('deduct')}
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  direction === 'deduct'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/30 dark:text-red-400'
                    : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Deduct Funds
              </button>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Amount (₱)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for this adjustment"
                className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 p-6">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {success ? 'Close' : 'Cancel'}
        </button>
        {!success && (
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              direction === 'add' ? 'bg-[#0b1b62] hover:bg-[#08154d]' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isSaving ? 'Saving…' : direction === 'add' ? 'Add Funds' : 'Deduct Funds'}
          </button>
        )}
      </div>
    </Modal>
  )
}
