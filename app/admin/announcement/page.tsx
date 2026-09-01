import { createClient } from '@/lib/supabase/server'
import { AnnouncementFeed } from '@/components/admin/announcement-feed'

type AnnouncementRow = {
  id: string
  title: string
  body: string
  target_role: string
  created_at: string
  profiles: { first_name: string; last_name: string } | null
}

export default async function AdminAnnouncementPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, target_role, created_at, profiles(first_name, last_name)')
    .order('created_at', { ascending: false })
    .returns<AnnouncementRow[]>()

  const announcements = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    target_role: a.target_role,
    created_at: a.created_at,
    posted_by_name: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'Staff',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Announcement</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Broadcast school-wide updates, or manage announcements posted by teachers.
        </p>
      </div>

      <AnnouncementFeed announcements={announcements} />
    </div>
  )
}
