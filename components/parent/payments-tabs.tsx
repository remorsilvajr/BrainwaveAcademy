'use client'

import { useState } from 'react'
import { FundRequestHistory, type FundRequest } from '@/components/parent/fund-request-history'

type Tab = 'fees' | 'requests'

const tabs: { key: Tab; label: string }[] = [
  { key: 'fees', label: 'Fees & Payments' },
  { key: 'requests', label: 'Request History' },
]

// Sub-tabs of the Payments page, same tab-bar look as FeedbackTabs and the
// admin PaymentsTabs (border-b-2, pink active). The fee content is passed in as
// `feesContent` (the fee breakdown, or an empty state before a child is
// enrolled) so it stays server-rendered; the wallet request history is the
// parent's own and shows in every case, since the wallet isn't tied to a child.
export function PaymentsTabs({ feesContent, requests }: { feesContent: React.ReactNode; requests: FundRequest[] }) {
  const [tab, setTab] = useState<Tab>('fees')
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium ${
              tab === t.key
                ? 'border-[#e6007e] text-[#e6007e]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.key === 'requests' && pending > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {pending} pending
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'fees' && feesContent}
      {tab === 'requests' && <FundRequestHistory requests={requests} />}
    </div>
  )
}
