'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { payAmountWithWallet } from '@/app/parent/payments/actions'
import { isOverdue, remainingBalance } from '@/lib/payments'

type Payment = {
  id: string
  description: string | null
  fee_type: string
  amount: number
  amount_paid: number
  due_date: string | null
  status: string
}

export type Transaction = {
  id: string
  payment_id: string
  amount: number
  payment_method: string | null
  transaction_date: string | null
  feeDescription: string | null
  feeType: string
}

const methodLabels: Record<string, string> = { wallet: 'Wallet', cash: 'Cash', check: 'Check' }

function FeeRow({ payment }: { payment: Payment }) {
  const overdue = isOverdue(payment)
  const remaining = remainingBalance(payment)
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.description ?? payment.fee_type}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {payment.due_date ? `Due ${formatDateLong(payment.due_date)}` : 'No due date'}
          {overdue && <span className="ml-2 font-semibold text-red-600 dark:text-red-400">Overdue</span>}
        </p>
        {payment.amount_paid > 0 && (
          <p className="mt-1 text-xs text-[#00a3e0] dark:text-sky-400">
            {formatCurrency(payment.amount_paid)} of {formatCurrency(payment.amount)} paid
          </p>
        )}
      </div>
      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(remaining)}</span>
    </div>
  )
}

export function FeeBreakdown({
  studentId,
  studentName,
  classroomName,
  walletBalance,
  payments,
  transactions,
}: {
  studentId: string
  studentName: string
  classroomName: string | null
  walletBalance: number
  payments: Payment[]
  transactions: Transaction[]
}) {
  const router = useRouter()
  // Waived and voided fees (cancelled at withdrawal, or corrected by admin) are neither owed nor paid, so they are in neither list.
  const outstanding = payments.filter((p) => p.status === 'pending')
  const totalDue = outstanding.reduce((sum, p) => sum + remainingBalance(p), 0)
  const canAfford = walletBalance > 0

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [payAmount, setPayAmount] = useState(String(totalDue))

  // Resets the input to the new total whenever it actually changes (e.g.
  // after a successful payment reduces it) without clobbering an in-progress
  // edit the parent is still typing.
  useEffect(() => {
    setPayAmount(String(totalDue))
  }, [totalDue])

  function handlePay() {
    setError('')
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (amount > totalDue) {
      setError("That's more than your total outstanding balance for this child.")
      return
    }
    startTransition(async () => {
      try {
        const result = await payAmountWithWallet(studentId, amount)
        if (result?.error) {
          setError(result.error)
          return
        }
        router.refresh()
      } catch {
        setError('Something went wrong.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Outstanding</p>
        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalDue)}</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {studentName}
          {classroomName ? ` · ${classroomName}` : ''}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Outstanding Fees</h2>
        <div className="mt-4 space-y-3">
          {outstanding.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No outstanding fees. You&apos;re all caught up.</p>
          ) : (
            outstanding.map((p) => <FeeRow key={p.id} payment={p} />)
          )}
        </div>

        {outstanding.length > 0 && (
          <div className="mt-5 space-y-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Pay toward your total (you don&apos;t need to pay it all at once)
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">₱</span>
                <input
                  type="number"
                  min="0"
                  max={totalDue}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={() => setPayAmount(String(totalDue))}
                className="text-xs font-semibold text-[#00a3e0] hover:underline dark:text-sky-400"
              >
                Pay full amount
              </button>
              <button
                onClick={handlePay}
                disabled={isPending || !canAfford}
                title={!canAfford ? 'Your wallet has no balance' : undefined}
                className="rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? 'Paying…' : 'Pay with Wallet'}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Wallet balance: {formatCurrency(walletBalance)}. Paid toward the fee due soonest first.
            </p>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment History</h2>
        <div className="mt-4 space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.feeDescription ?? t.feeType}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.transaction_date ? formatDateLong(t.transaction_date) : '-'} ·{' '}
                    {t.payment_method ? (methodLabels[t.payment_method] ?? t.payment_method) : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(t.amount)}</span>
                  <Link
                    href={`/parent/payments/${t.payment_id}/receipt`}
                    className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-3 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                  >
                    View Receipt
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
