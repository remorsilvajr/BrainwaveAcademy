'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { RequestFundsModal } from '@/components/parent/request-funds-modal'

// Balance and Add Funds only. The list of past top-up requests lives in its own
// tab on the Payments page (PaymentsTabs / FundRequestHistory).
export function WalletPanel({ balance }: { balance: number }) {
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

      {showRequestModal && <RequestFundsModal onClose={() => setShowRequestModal(false)} />}
    </div>
  )
}
