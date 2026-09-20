'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select'
import { recordManualPayment } from '@/app/admin/payments/actions'

export function RecordPaymentModal({
  studentOptions,
  onClose,
}: {
  studentOptions: SearchableOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [feeType, setFeeType] = useState('tuition')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!studentId) {
      setError('Select a student.')
      return
    }
    setIsSaving(true)
    try {
      const result = await recordManualPayment(studentId, {
        feeType,
        description,
        amount: Number(amount),
        method,
      })
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Record Manual Payment</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          For a cash or check payment received outside the app. This does not touch the parent&apos;s wallet.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {success ? (
          <p className="rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            Payment recorded. You can close this window or record another.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Student</label>
              <SearchableSelect
                options={studentOptions}
                value={studentId}
                onChange={setStudentId}
                placeholder="Select a student…"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Fee Type</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                >
                  <option value="tuition">Tuition</option>
                  <option value="activity">Activity Fee</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Field trip fee, September tuition"
                className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Amount (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
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
            className="flex-1 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
          >
            {isSaving ? 'Recording…' : 'Record Payment'}
          </button>
        )}
      </div>
    </Modal>
  )
}
