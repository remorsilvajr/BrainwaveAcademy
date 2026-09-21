'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaymentsTable, type PaymentRow } from '@/components/admin/payments-table'
import { ParentWalletsTable, type ParentWallet } from '@/components/admin/parent-wallets-table'
import { WalletRequestsPanel, type WalletRequest } from '@/components/admin/wallet-requests-panel'
import type { SearchableOption } from '@/components/ui/searchable-select'

type Tab = 'payments' | 'wallets' | 'requests'

const VALID_TABS: Tab[] = ['payments', 'wallets', 'requests']
const VALID_STATUSES = ['pending', 'overdue', 'paid']

export function PaymentsTabs({
  payments,
  studentOptions,
  parents,
  requests,
}: {
  payments: PaymentRow[]
  studentOptions: SearchableOption[]
  parents: ParentWallet[]
  requests: WalletRequest[]
}) {
  // Supports deep-linking from the dashboard's "Pending Fund Requests" card
  // (`/admin/payments?tab=requests`) — read once on mount as the initial
  // tab rather than staying in sync with the URL afterward, so clicking
  // between tabs here doesn't need to push a new URL each time.
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(
    initialTab && (VALID_TABS as string[]).includes(initialTab) ? (initialTab as Tab) : 'payments'
  )
  // Same deep-link idea for the dashboard's Outstanding Balance card
  // (`/admin/payments?status=pending`): only seeds the table's initial filter.
  const statusParam = searchParams.get('status')
  const initialStatus = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : 'all'
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const tabs: { key: Tab; label: string }[] = [
    { key: 'payments', label: 'Payments' },
    { key: 'wallets', label: 'Parent Wallets' },
    { key: 'requests', label: 'Payment Requests' },
  ]

  return (
    <div>
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-medium ${
              tab === t.key
                ? 'border-[#e6007e] text-[#e6007e]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.key === 'requests' && pendingCount > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'payments' && <PaymentsTable payments={payments} studentOptions={studentOptions} initialStatus={initialStatus} />}
        {tab === 'wallets' && <ParentWalletsTable parents={parents} />}
        {tab === 'requests' && <WalletRequestsPanel requests={requests} />}
      </div>
    </div>
  )
}
