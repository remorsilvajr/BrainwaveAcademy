'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaymentsTable, type PaymentRow, type ReceivedRow } from '@/components/admin/payments-table'
import { StudentBalancesTable, type BalanceStudent } from '@/components/admin/student-balances-table'
import type { SearchableOption } from '@/components/ui/searchable-select'
import type { FeeAdjustment } from '@/lib/fees'

// One job per tab: Fees (what is owed, and correcting it), Received (money
// in, one row per payment, receipts, reversals) and Student Balances (every
// student's account: billed, paid, still owed, overdue). Parents pay online, so the old
// wallet tabs (Wallet Activity, Parent Wallets, Fund Requests) are gone; their
// tables are kept in the database. `payments` is the old name of the first
// tab, still accepted so existing links keep working.
type Tab = 'fees' | 'received' | 'balances'

const VALID_TABS: Tab[] = ['fees', 'received', 'balances']
const VALID_STATUSES = ['pending', 'overdue', 'waived', 'voided']

export function PaymentsTabs({
  payments,
  received,
  adjustmentsByPayment,
  studentOptions,
  balanceStudents,
  classrooms,
  mode = 'admin',
  canDeleteFees = false,
}: {
  payments: PaymentRow[]
  received: ReceivedRow[]
  balanceStudents: BalanceStudent[]
  classrooms: { id: string; name: string }[]
  adjustmentsByPayment: Record<string, FeeAdjustment[]>
  studentOptions: SearchableOption[]
  // The cashier portal shows the same tabs without the admin-only corrections.
  mode?: 'admin' | 'cashier'
  canDeleteFees?: boolean
}) {
  // Read once on mount as the initial tab (`?tab=received`), not kept in sync with the URL.
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(initialTab && (VALID_TABS as string[]).includes(initialTab) ? (initialTab as Tab) : 'fees')
  // The dashboard's Outstanding Balance card (`/admin/payments?status=pending`) seeds the table's filter.
  const statusParam = searchParams.get('status')
  const initialStatus = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : 'all'
  const [feesSearch, setFeesSearch] = useState('')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'fees', label: 'Fees' },
    { key: 'received', label: 'Received' },
    { key: 'balances', label: 'Student Balances' },
  ]

  return (
    <div>
      <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setFeesSearch('')
              setTab(t.key)
            }}
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
        {tab === 'balances' ? (
          <StudentBalancesTable
            students={balanceStudents}
            classrooms={classrooms}
            payments={payments}
            received={received}
            canAddFee={mode === 'admin'}
            onViewFees={(student) => {
              setFeesSearch(student.accountId ?? student.name)
              setTab('fees')
            }}
          />
        ) : (
          <PaymentsTable
            key={`${tab}|${feesSearch}`}
            view={tab}
            payments={payments}
            received={received}
            adjustmentsByPayment={adjustmentsByPayment}
            studentOptions={studentOptions}
            initialStatus={tab === 'fees' ? initialStatus : 'all'}
            initialSearch={tab === 'fees' ? feesSearch : ''}
            canCorrect={mode === 'admin'}
            canDeleteFees={mode === 'admin' && canDeleteFees}
            receiptBasePath={mode === 'admin' ? '/admin/payments' : '/cashier/payments'}
          />
        )}
      </div>
    </div>
  )
}
