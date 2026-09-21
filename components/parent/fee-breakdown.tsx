'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { payFeeWithWallet } from '@/app/parent/payments/actions'
import { isOverdue } from '@/lib/payments'

type Payment = {
  id: string
  description: string | null
  fee_type: string
  amount: number
  due_date: string | null
  status: string
  payment_method: string | null
  transaction_date: string | null
}

function PayRow({ payment, walletBalance }: { payment: Payment; walletBalance: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const overdue = isOverdue(payment)
  const canAfford = walletBalance >= payment.amount

  function handlePay() {
    setError('')
    startTransition(async () => {
      try {
        const result = await payFeeWithWallet(payment.id)
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
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.description ?? payment.fee_type}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {payment.due_date ? `Due ${formatDateLong(payment.due_date)}` : 'No due date'}
          {overdue && <span className="ml-2 font-semibold text-red-600 dark:text-red-400">Overdue</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(payment.amount)}</span>
        <button
          onClick={handlePay}
          disabled={isPending || !canAfford}
          title={!canAfford ? 'Insufficient wallet balance' : undefined}
          className="rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Paying…' : 'Pay with Wallet'}
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
      {!canAfford && !error && (
        <p className="w-full text-xs text-red-600 dark:text-red-400">
          Insufficient wallet balance to cover this fee.
        </p>
      )}
    </div>
  )
}

export function FeeBreakdown({
  studentName,
  classroomName,
  walletBalance,
  payments,
}: {
  studentName: string
  classroomName: string | null
  walletBalance: number
  payments: Payment[]
}) {
  const outstanding = payments.filter((p) => p.status !== 'paid')
  const history = payments.filter((p) => p.status === 'paid')
  const totalDue = outstanding.reduce((sum, p) => sum + p.amount, 0)

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
            outstanding.map((p) => <PayRow key={p.id} payment={p} walletBalance={walletBalance} />)
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment History</h2>
        <div className="mt-4 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
          ) : (
            history.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.description ?? p.fee_type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {p.transaction_date ? formatDateLong(p.transaction_date) : '-'} · {p.payment_method ?? '-'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.amount)}</span>
                  <Link
                    href={`/parent/payments/${p.id}/receipt`}
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
