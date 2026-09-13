import { createClient } from '@/lib/supabase/server'
import { AnnouncementList } from '@/components/parent/announcement-list'
import { getParentClassroomIds, classroomVisibilityFilter } from '@/lib/parent-classrooms'

type AnnouncementRow = {
  id: string
  title: string
  body: string
  created_at: string
  classroom_id: string | null
  profiles: { first_name: string; last_name: string } | null
}

export default async function ParentAnnouncementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const classroomIds = await getParentClassroomIds(supabase, user?.id ?? '')

  const [{ data }, { data: classrooms }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, title, body, created_at, classroom_id, profiles(first_name, last_name)')
      .in('target_role', ['parent', 'all'])
      .or(classroomVisibilityFilter(classroomIds))
      .order('created_at', { ascending: false })
      .returns<AnnouncementRow[]>(),
    supabase.from('classrooms').select('id, name'),
  ])

  const classroomNameById = new Map((classrooms ?? []).map((c) => [c.id, c.name]))

  const announcements = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_at: a.created_at,
    posted_by_name: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'Staff',
    classroomName: a.classroom_id ? (classroomNameById.get(a.classroom_id) ?? null) : null,
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
