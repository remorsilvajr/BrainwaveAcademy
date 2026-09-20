import { FeedbackTabs } from '@/components/feedback/feedback-tabs'

export default function ParentFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Feedback</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Report a bug, share a concern or suggestion, or check on something you sent before.
        </p>
      </div>

      <FeedbackTabs />
    </div>
  )
}
