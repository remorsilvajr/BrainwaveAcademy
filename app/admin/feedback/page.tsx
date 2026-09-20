import { createClient } from '@/lib/supabase/server'
import { FeedbackTable } from '@/components/admin/feedback-table'

type FeedbackRow = {
  id: string
  subject: string
  message: string
  category: string
  resolved: boolean
  created_at: string
  image_path: string | null
  admin_response: string | null
  responded_at: string | null
  profiles: { first_name: string; last_name: string; email: string; role: string } | null
}

export default async function AdminFeedbackPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('feedback')
    .select(
      'id, subject, message, category, resolved, created_at, image_path, admin_response, responded_at, profiles(first_name, last_name, email, role)'
    )
    .order('created_at', { ascending: false })
    .returns<FeedbackRow[]>()

  const items = (data ?? []).map((f) => ({
    id: f.id,
    subject: f.subject,
    message: f.message,
    category: f.category,
    resolved: f.resolved,
    created_at: f.created_at,
    image_path: f.image_path,
    admin_response: f.admin_response,
    responded_at: f.responded_at,
    submitter_name: f.profiles ? `${f.profiles.first_name} ${f.profiles.last_name}` : 'Unknown',
    submitter_email: f.profiles?.email ?? null,
    submitter_role: f.profiles?.role ?? null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Feedback</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Bug reports and feedback sent in by parents, teachers, and admins from their profile
          menu. Categorize each item and reply to keep the sender informed.
        </p>
      </div>

      <FeedbackTable items={items} />
    </div>
  )
}
