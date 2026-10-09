'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { unenrollStudent } from '@/app/admin/unenrollment/actions'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDateShort, roundToCents } from '@/lib/format'
import { UNENROLLMENT_REASON_MAX, UNENROLLMENT_REASON_MIN, type FeeDecision } from '@/lib/unenrollment'

export type UnenrollCandidate = {
  id: string
  name: string
  studentAccountId: string | null
  programName: string | null
  // A pending request from the parent: that child is handled in the Requests tab.
  hasPendingRequest: boolean
  unpaidFees: { id: string; description: string; amount: number; due_date: string | null }[]
}

// The "Unenroll a Student" tab: the school withdraws a child itself. Same outcome
// as approving a parent's request (see unenrollStudent).
export function UnenrollStudentForm({ students }: { students: UnenrollCandidate[] }) {
  const router = useRouter()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [feeDecision, setFeeDecision] = useState<FeeDecision | ''>('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const selected = students.find((s) => s.id === studentId) ?? null
  const unpaidTotal = selected ? roundToCents(selected.unpaidFees.reduce((sum, f) => sum + f.amount, 0)) : 0
  const hasUnpaid = !!selected && selected.unpaidFees.length > 0

  function pick(id: string) {
    setStudentId(id)
    setFeeDecision('')
    setError('')
    setDone('')
  }

  function review() {
    setError('')
    if (!selected) return setError('Choose a student first.')
    if (selected.hasPendingRequest) return setError(`${selected.name}'s parent already asked to unenroll them. Review it in the Unenrollment Requests tab.`)
    if (reason.trim().length < UNENROLLMENT_REASON_MIN) return setError('Write the reason for unenrolling, in a few words.')
    if (hasUnpaid && !feeDecision) return setError('Choose what happens to the unpaid fees first.')
    setConfirming(true)
  }

  async function submit() {
    if (!selected) return
    setIsPending(true)
    try {
      const result = await unenrollStudent(selected.id, feeDecision || null, reason)
      if (result?.error) {
        setError(result.error)
        return
      }
      setDone(`${selected.name} has been unenrolled. Their parents were notified.`)
      setStudentId(null)
      setReason('')
      setFeeDecision('')
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setIsPending(false)
      setConfirming(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Unenroll a Student</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Withdraw a child without a request from their family. They leave class lists, attendance and pickup right away, and
          their parents are told the reason. Their records and receipts stay.
        </p>
      </div>

      {done && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">{done}</p>}

      <div>
        <p className="mb-1 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
          Student <span className="text-red-500">*</span>
        </p>
        <SearchableSelect
          options={students.map((s) => ({ value: s.id, label: s.name, sublabel: [s.studentAccountId, s.programName].filter(Boolean).join(' · ') || undefined }))}
          value={studentId}
          onChange={pick}
          placeholder="Search for a student…"
        />
        {selected?.hasPendingRequest && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {selected.name}&apos;s parent already asked to unenroll them. Review it in the Unenrollment Requests tab.
          </p>
        )}
      </div>

      {selected && !selected.hasPendingRequest && (
        <>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Unpaid fees {hasUnpaid ? `(${formatCurrency(unpaidTotal)})` : ''}
            </p>
            {hasUnpaid ? (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                {selected.unpaidFees.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {f.description}
                      {f.due_date && <span className="ml-2 text-xs text-gray-400">due {formatDateShort(f.due_date)}</span>}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(f.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No unpaid fees.</p>
            )}
          </div>

          {hasUnpaid && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                What happens to the unpaid fees? <span className="text-red-500">*</span>
              </legend>
              <div className="space-y-2">
                {(
                  [
                    ['keep', 'Keep them collectible', 'The family still owes what was billed. It stays in Outstanding.'],
                    ['waive', 'Waive them', 'Cancel the unpaid fees. They no longer count as owed.'],
                  ] as const
                ).map(([value, label, help]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                      feeDecision === value
                        ? 'border-[#0b1b62] bg-[#0b1b62]/5 dark:border-indigo-400 dark:bg-indigo-400/10'
                        : 'border-gray-200 hover:border-[#0b1b62]/40 dark:border-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="unenroll-fee-decision"
                      value={value}
                      checked={feeDecision === value}
                      onChange={() => setFeeDecision(value)}
                      className="mt-1 accent-[#0b1b62]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor="unenroll-reason" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="unenroll-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={UNENROLLMENT_REASON_MAX}
              rows={3}
              placeholder="Sent to the parents with the notice."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400"
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={review}
          disabled={!selected || selected.hasPendingRequest || isPending}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Unenroll Student
        </button>
      </div>

      {confirming && selected && (
        <ConfirmDialog
          title="Unenroll this student?"
          description={`${selected.name} will be withdrawn now and their parents notified.${
            hasUnpaid ? (feeDecision === 'waive' ? ` ${formatCurrency(unpaidTotal)} in unpaid fees will be waived.` : ' Unpaid fees stay collectible.') : ''
          }`}
          confirmLabel="Yes, Unenroll"
          isPending={isPending}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
