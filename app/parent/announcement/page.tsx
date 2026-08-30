import { Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@/lib/format'

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

  const announcements = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Announcement</h1>
        <p className="mt-1 text-sm text-gray-500">School-wide news and updates from Brainwave Academy.</p>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Megaphone className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-gray-900">No announcements yet</p>
          <p className="mt-1 text-sm text-gray-500">Check back here for school-wide news and updates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
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
        </div>
      )}
    </div>
  )
}
