import { Sidebar, type NavSection } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'

const sections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
      { label: 'Announcement', href: '/admin/announcement', icon: 'announcement' },
      { label: 'User Management', href: '/admin/user-management', icon: 'users' },
      { label: 'Create New Account', href: '/admin/create-new-account', icon: 'checklist' },
      { label: 'Enrollment Requests', href: '/admin/enroll-a-student', icon: 'userPlus' },
      { label: 'Applications', href: '/admin/applications', icon: 'file' },
    ],
  },
  {
    title: 'Student',
    items: [
      { label: 'Students', href: '/admin/students', icon: 'user' },
      { label: 'Attendance', href: '/admin/attendance', icon: 'checklist' },
      { label: 'Student Dashboard', href: '/admin/student-dashboard', icon: 'graduationCap' },
    ],
  },
  {
    title: 'Teacher',
    items: [
      { label: 'Teachers', href: '/admin/teachers', icon: 'teacher' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Activity Log', href: '/admin/logs', icon: 'checklist' },
      { label: 'Settings', href: '/admin/settings', icon: 'settings' },
      { label: 'Log Out', isLogout: true, icon: 'logout' },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Everything else about this layout — sections, routes, styling — is
  // identical for a super admin ("the portal should look exactly like the
  // admin", per CLAUDE.md's Super admin note); this label is the one
  // deliberate exception, so it's visible at a glance which kind of admin
  // account is signed in.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const portalLabel = profile?.is_super_admin ? 'Super Admin Portal' : 'Admin Portal'

  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel={portalLabel} />
      <main className="min-w-0 flex-1 bg-[#faf9fc] dark:bg-gray-950 px-4 pb-8 pt-20 lg:ml-64 lg:px-8 lg:pt-8">{children}</main>
    </div>
  )
}
