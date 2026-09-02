import { Sidebar, type NavSection } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'

const baseSections: NavSection[] = [
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
  // Reverted 2026-09-04 (was briefly a distinct "Super Admin Portal" label
  // and a renamed "Super Admin" section — see CLAUDE.md's Super admin note
  // for the full history): the concept of a super admin tier must not be
  // discoverable anywhere in the portal by a regular admin, full stop —
  // asked for explicitly, no exceptions. Portal label and section title
  // are now identical for every admin session, whatever `is_super_admin`
  // is. The one remaining, deliberately unannounced difference is which
  // nav items render — a super admin session gets one additional item,
  // "Deleted Items" (app/admin/deleted-items), spliced into the ordinary
  // Admin section with no renaming or explanation — so `sections` still
  // needs building per-request off `profile` rather than living at module
  // scope. That page enforces the same restriction server-side too
  // (redirects a regular admin who navigates there directly), so hiding
  // the link here is only the visible half of that gate, not the real one.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const isSuperAdmin = !!profile?.is_super_admin

  const sections: NavSection[] = baseSections.map((section) =>
    section.title === 'Admin' && isSuperAdmin
      ? {
          ...section,
          items: [
            { label: 'Deleted Items', href: '/admin/deleted-items', icon: 'trash' },
            ...section.items,
          ],
        }
      : section
  )

  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel="Admin Portal" />
      <main className="min-w-0 flex-1 bg-[#faf9fc] dark:bg-gray-950 px-4 pb-8 pt-20 lg:ml-64 lg:px-8 lg:pt-8">{children}</main>
    </div>
  )
}
