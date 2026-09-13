'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { RequestFundsModal } from '@/components/parent/request-funds-modal'

type WalletRequest = {
  id: string
  requested_amount: number
  approved_amount: number | null
  status: string
  created_at: string
}

const statusBadgeClasses: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  approved: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  denied: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
}

export function WalletPanel({ balance, requests }: { balance: number; requests: WalletRequest[] }) {
  const [showRequestModal, setShowRequestModal] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">Wallet Balance</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-[#0b1b62] dark:text-indigo-300">{formatCurrency(balance)}</p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="rounded-lg bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d]"
        >
          Add Funds
        </button>
      </div>

      {requests.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Requested {formatCurrency(r.requested_amount)} on {formatDateLong(r.created_at)}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClasses[r.status]}`}>
                {r.status === 'approved' ? `Approved: ${formatCurrency(r.approved_amount ?? 0)}` : r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {showRequestModal && <RequestFundsModal onClose={() => setShowRequestModal(false)} />}
    </div>
  )
}
