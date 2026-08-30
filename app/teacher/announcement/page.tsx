import { Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClassroomAnnouncements } from '@/components/teacher/classroom-announcements'
import { formatRelativeTime } from '@/lib/format'

type AnnouncementRow = {
  id: string
  title: string
  body: string
  created_at: string
  profiles: { first_name: string; last_name: string } | null
}

export default async function TeacherAnnouncementPage() {
  const supabase = await createClient()

  const [{ data: classroomRows }, { data: schoolRows }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, title, body, created_at, profiles(first_name, last_name)')
      .eq('target_role', 'parent')
      .order('created_at', { ascending: false })
      .returns<AnnouncementRow[]>(),
    supabase
      .from('announcements')
      .select('id, title, body, created_at, profiles(first_name, last_name)')
      .in('target_role', ['teacher', 'all'])
      .order('created_at', { ascending: false })
      .returns<AnnouncementRow[]>(),
  ])

  const classroomAnnouncements = (classroomRows ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_at: a.created_at,
    posted_by_name: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'Staff',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Announcement</h1>
        <p className="mt-1 text-sm text-gray-500">Post updates for parents and see what the school has shared.</p>
      </div>

      <ClassroomAnnouncements announcements={classroomAnnouncements} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900">School Announcements</h2>
        <p className="mt-1 text-sm text-gray-500">Posted by the school administration.</p>
        <div className="mt-4 space-y-3">
          {(schoolRows ?? []).map((a) => (
            <div key={a.id} className="flex gap-3 rounded-xl border border-gray-100 p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#0b1b62]">
                <Megaphone className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="mt-1 text-sm text-gray-600">{a.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Posted {formatRelativeTime(a.created_at)} by{' '}
                  {a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'Staff'}
                </p>
              </div>
            </div>
          ))}
          {(schoolRows ?? []).length === 0 && (
            <p className="text-sm text-gray-500">No school announcements yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
