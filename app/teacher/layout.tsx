import { Sidebar, type NavSection } from '@/components/sidebar'
import { TeacherTopBar } from '@/components/teacher/teacher-topbar'
import { createClient } from '@/lib/supabase/server'

const sections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/teacher', icon: 'dashboard' },
      { label: 'Announcement', href: '/teacher/announcement', icon: 'announcement' },
    ],
  },
  {
    title: 'Student',
    items: [
      { label: 'Students', href: '/teacher/students', icon: 'users' },
      { label: 'Attendance', href: '/teacher/attendance', icon: 'checklist' },
      { label: 'Student Dashboard', href: '/teacher/student-dashboard', icon: 'graduationCap' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'My Profile', href: '/teacher/my-profile', icon: 'user' },
      { label: 'Settings', href: '/teacher/settings', icon: 'settings' },
      { label: 'Log Out', isLogout: true, icon: 'logout' },
    ],
  },
]

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', user?.id ?? '')
    .single()

  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel="Teacher Portal" />
      <div className="ml-64 flex-1">
        <TeacherTopBar
          sections={sections}
          teacher={{
            first_name: profile?.first_name ?? '',
            last_name: profile?.last_name ?? '',
            avatar_url: profile?.avatar_url ?? null,
          }}
        />
        <main className="bg-[#faf9fc] p-8">{children}</main>
      </div>
    </div>
  )
}
