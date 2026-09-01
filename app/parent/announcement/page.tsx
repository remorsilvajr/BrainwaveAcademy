import { createClient } from '@/lib/supabase/server'
import { AnnouncementList } from '@/components/parent/announcement-list'

type AnnouncementRow = {
  id: string
  title: string
  body: string
  created_at: string
  profiles: { first_name: string; last_name: string } | null
}

export default async function ParentAnnouncementPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, created_at, profiles(first_name, last_name)')
    .in('target_role', ['parent', 'all'])
    .order('created_at', { ascending: false })
    .returns<AnnouncementRow[]>()

  const announcements = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_at: a.created_at,
    posted_by_name: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'Staff',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Announcement</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">School-wide news and updates from Brainwave Academy.</p>
      </div>

      <AnnouncementList announcements={announcements} />
    </div>
  )
}
