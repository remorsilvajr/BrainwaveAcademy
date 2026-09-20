'use client'

import { Bug, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { FeedbackForm } from '@/components/feedback/feedback-form'

// Reachable from ProfileMenu, so this modal has no idea what page it was
// opened from (public site, admin portal — parent/teacher moved this into
// their own sidebar Feedback page instead, see components/feedback/
// feedback-tabs.tsx) — it only needs an authenticated user, enforced
// server-side in submitFeedback. One shared modal backs both ProfileMenu
// entry points ("Report a Bug" and "Feedback & Concerns") — initialCategory
// just pre-selects the dropdown to match whichever the user clicked.
export function BugReportModal({
  onClose,
  initialCategory = 'bug',
}: {
  onClose: () => void
  initialCategory?: string
}) {
  return (
    <Modal onClose={onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {initialCategory === 'bug' ? 'Report a Bug' : 'Send Feedback'}
          </h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <FeedbackForm initialCategory={initialCategory} onCancel={onClose} />
    </Modal>
  )
}
