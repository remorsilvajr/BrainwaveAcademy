'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CalendarClock, HandHeart, Pencil, X } from 'lucide-react'
import { editPendingFee, voidFee, waiveFee } from '@/app/admin/payments/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DobSelect } from '@/components/ui/dob-select'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDateLong, formatDateShort, todayIso } from '@/lib/format'
import {
  FEE_REASON_MAX,
  feeAdjustmentLabels,
  validateFeeAmount,
  validateFeeDueDate,
  validateFeeReason,
  type FeeAdjustment,
} from '@/lib/fees'

export type ManagedFee = {
  id: string
  studentName: string
  description: string | null
  fee_type: string
  amount: number
  due_date: string | null
  status: string
}

type Mode = 'edit' | 'waive' | 'void'

const modes: { key: Mode; label: string; help: string; icon: typeof Pencil }[] = [
  { key: 'edit', label: 'Edit amount or due date', help: 'Correct a mistake on this unpaid fee.', icon: Pencil },
  { key: 'waive', label: 'Waive', help: 'The family no longer owes it (hardship, discount). Kept in history.', icon: HandHeart },
  { key: 'void', label: 'Void', help: 'It should never have existed (wrong student or amount).', icon: Ban },
]

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400'

// Everything you can do to one fee. Only an unpaid fee offers actions; a waived
// or voided one (and any fee's past changes) is shown as read-only history.
export function FeeManageModal({
  fee,
  adjustments,
  onClose,
}: {
  fee: ManagedFee
  adjustments: FeeAdjustment[]
  onClose: () => void
}) {
  const router = useRouter()
  const isPending = fee.status === 'pending'
  const thisYear = Number(todayIso().slice(0, 4))

  const [mode, setMode] = useState<Mode | null>(null)
  const [amount, setAmount] = useState(String(fee.amount))
  const [dueDate, setDueDate] = useState(fee.due_date ?? '')
  const [duePartial, setDuePartial] = useState(false)
  const [dueSeed, setDueSeed] = useState(fee.due_date ?? '')
  const [dueKey, setDueKey] = useState(0)
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  const title = fee.description || `${fee.fee_type.charAt(0).toUpperCase()}${fee.fee_type.slice(1)} fee`

  function validate(): string | null {
    const reasonError = validateFeeReason(reason)
    if (reasonError) return reasonError
    if (mode === 'edit') {
      if (duePartial) return 'Pick the day, month, and year of the due date, or clear it.'
      return validateFeeAmount(Number(amount)) ?? validateFeeDueDate(dueDate || null)
    }
    return null
  }

  function askConfirm() {
    setError('')
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setConfirming(true)
  }

  async function handleConfirm() {
    if (!mode) return
    setIsWorking(true)
    setError('')
    try {
      const result =
        mode === 'edit'
          ? await editPendingFee(fee.id, { amount: Number(amount), dueDate: dueDate || null }, reason)
          : mode === 'waive'
            ? await waiveFee(fee.id, reason)
            : await voidFee(fee.id, reason)
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
      <Modal onClose={onClose} maxWidth="2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-[#0b1b62] dark:text-indigo-300">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{fee.studentName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 dark:text-gray-500">Amount</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(fee.amount)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 dark:text-gray-500">Due date</p>
              <p className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <CalendarClock className="h-3.5 w-3.5" />
                {fee.due_date ? formatDateShort(fee.due_date) : 'Not set'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 dark:text-gray-500">Status</p>
              <p className="text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">{fee.status}</p>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

          {isPending && (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {modes.map(({ key, label, help, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMode(key)
                      setError('')
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      mode === key
                        ? 'border-[#0b1b62] bg-[#0b1b62]/5 dark:border-indigo-400 dark:bg-indigo-400/10'
                        : 'border-gray-200 hover:border-[#0b1b62]/40 dark:border-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-[#0b1b62] dark:text-indigo-300" />
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{help}</p>
                  </button>
                ))}
              </div>

              {mode && (
                <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  {mode === 'edit' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
                      <div>
                        <label htmlFor="fee-amount" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="fee-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <DobSelect
                          key={dueKey}
                          label="Due date"
                          defaultValue={dueSeed}
                          min={`${thisYear - 1}-01-01`}
                          max={`${thisYear + 1}-12-31`}
                          onChange={setDueDate}
                          onPartialChange={setDuePartial}
                        />
                        {(dueDate || duePartial) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDueSeed('')
                              setDueKey((k) => k + 1)
                              setDueDate('')
                              setDuePartial(false)
                            }}
                            className="mt-1 text-xs font-semibold text-[#00a3e0] hover:underline dark:text-sky-400"
                          >
                            Clear date
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="fee-reason" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="fee-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      maxLength={FEE_REASON_MAX}
                      placeholder="Recorded in the fee's history."
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">The parent is told in their notifications. The reason stays with admin.</p>
                  </div>

                  <button
                    type="button"
                    onClick={askConfirm}
                    className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
                      mode === 'edit' ? 'bg-[#0b1b62] hover:bg-[#08154d]' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {mode === 'edit' ? 'Save changes' : mode === 'waive' ? 'Waive this fee' : 'Void this fee'}
                  </button>
                </div>
              )}
            </>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">History</p>
            {adjustments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No changes have been made to this fee.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                {adjustments.map((a) => (
                  <li key={a.id} className="px-3 py-2 text-sm">
                    <p className="flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{feeAdjustmentLabels[a.action]}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatDateLong(a.created_at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">{a.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 p-6 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 px-5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </Modal>

      {confirming && mode && (
        <ConfirmDialog
          title={mode === 'edit' ? 'Save these changes?' : mode === 'waive' ? 'Waive this fee?' : 'Void this fee?'}
          description={
            mode === 'edit'
              ? `${title} for ${fee.studentName} becomes ${formatCurrency(Number(amount))}${dueDate ? `, due ${formatDateShort(dueDate)}` : ', with no due date'}.`
              : mode === 'waive'
                ? `${fee.studentName}'s family will no longer owe ${formatCurrency(fee.amount)}.`
                : `${title} (${formatCurrency(fee.amount)}) will be cancelled and removed from what is owed.`
          }
          confirmLabel={mode === 'edit' ? 'Yes, Save' : mode === 'waive' ? 'Yes, Waive' : 'Yes, Void'}
          tone={mode === 'edit' ? 'neutral' : 'danger'}
          isPending={isWorking}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}
