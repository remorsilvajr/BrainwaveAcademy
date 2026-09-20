'use client'

import { MessageSquare, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { FeedbackForm } from '@/components/feedback/feedback-form'

// Reachable from ProfileMenu, so this modal has no idea what page it was
// opened from (public site, admin portal — parent/teacher moved this into
// their own sidebar Feedback page instead, see components/feedback/
// feedback-tabs.tsx) — it only needs an authenticated user, enforced
// server-side in submitFeedback. "Report a Bug" and "Feedback & Concerns"
// used to be two separate dropdown entries opening this same modal with a
// different initialCategory — merged into one "Send Feedback" entry since
// having two buttons for one form was redundant; the Category dropdown
// inside FeedbackForm (bug listed first) is what actually distinguishes a
// bug report from a general concern now.
export function BugReportModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Send Feedback</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <FeedbackForm initialCategory="bug" onCancel={onClose} />
    </Modal>
  )
}
