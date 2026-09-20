'use client'

import { useState } from 'react'
import { FeedbackForm } from '@/components/feedback/feedback-form'
import { MyFeedbackList } from '@/components/feedback/my-feedback-list'

type Tab = 'send' | 'mine'

const tabs: { key: Tab; label: string }[] = [
  { key: 'send', label: 'Send Feedback' },
  { key: 'mine', label: 'My Feedback' },
]

// Same tab-bar shape as PaymentsTabs (components/admin/payments-tabs.tsx) —
// border-b-2 pink-highlight tabs switching a single content area below,
// reused here for the parent/teacher sidebar's Feedback page. Moved out of
// the ProfileMenu dropdown (which still backs this for admin and the public
// site) so it has a proper home in the sidebar instead of being buried in
// the account menu.
//
// "Report a Bug" and "Feedback & Concerns" used to be two separate tabs
// here — both were the exact same form/table, just with a different
// pre-selected category, so having two tabs for one form read as
// redundant. One "Send Feedback" tab now covers both; the Category
// dropdown inside FeedbackForm (bug listed first, per lib/feedback.ts) is
// what actually distinguishes a bug report from a general concern.
export function FeedbackTabs() {
  const [tab, setTab] = useState<Tab>('send')

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex gap-6 border-b border-gray-100 dark:border-gray-800 px-6 pt-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              tab === t.key
                ? 'border-[#e6007e] text-[#e6007e]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'send' && <FeedbackForm initialCategory="bug" />}
      {tab === 'mine' && <MyFeedbackList />}
    </div>
  )
}
