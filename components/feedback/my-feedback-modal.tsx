'use client'

import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { MyFeedbackList } from '@/components/feedback/my-feedback-list'

export function MyFeedbackModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} maxWidth="lg">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Feedback</h2>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <MyFeedbackList />
    </Modal>
  )
}
