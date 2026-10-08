'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaymentsTable, type PaymentRow, type ReceivedRow } from '@/components/admin/payments-table'
import type { SearchableOption } from '@/components/ui/searchable-select'
import type { FeeAdjustment } from '@/lib/fees'

// One job per tab: Fees (what is owed, and correcting it) and Received (money
// in, one row per payment, receipts, reversals). Parents pay online, so the old
// wallet tabs (Wallet Activity, Parent Wallets, Fund Requests) are gone; their
// tables are kept in the database. `payments` is the old name of the first
// tab, still accepted so existing links keep working.
type Tab = 'fees' | 'received'

const VALID_TABS: Tab[] = ['fees', 'received']
const VALID_STATUSES = ['pending', 'overdue', 'waived', 'voided']

export function PaymentsTabs({
  payments,
  received,
  adjustmentsByPayment,
  studentOptions,
  mode = 'admin',
}: {
  payments: PaymentRow[]
  received: ReceivedRow[]
  adjustmentsByPayment: Record<string, FeeAdjustment[]>
  studentOptions: SearchableOption[]
  // The cashier portal shows the same tabs without the admin-only corrections.
  mode?: 'admin' | 'cashier'
}) {
  // Read once on mount as the initial tab (`?tab=received`), not kept in sync with the URL.
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(initialTab && (VALID_TABS as string[]).includes(initialTab) ? (initialTab as Tab) : 'fees')
  // The dashboard's Outstanding Balance card (`/admin/payments?status=pending`) seeds the table's filter.
  const statusParam = searchParams.get('status')
  const initialStatus = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : 'all'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'fees', label: 'Fees' },
    { key: 'received', label: 'Received' },
  ]

  return (
    <div>
      <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-medium ${
              tab === t.key
                ? 'border-[#e6007e] text-[#e6007e]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <PaymentsTable
          key={tab}
          view={tab}
          payments={payments}
          received={received}
          adjustmentsByPayment={adjustmentsByPayment}
          studentOptions={studentOptions}
          initialStatus={tab === 'fees' ? initialStatus : 'all'}
          canCorrect={mode === 'admin'}
          receiptBasePath={mode === 'admin' ? '/admin/payments' : '/cashier/payments'}
        />
      </div>
    </div>
  )
}
