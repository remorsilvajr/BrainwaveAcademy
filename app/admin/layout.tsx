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
  // Everything else about this layout — routes, styling — is identical for
  // a super admin ("the portal should look exactly like the admin", per
  // CLAUDE.md's Super admin note). Deliberate exceptions, all keyed off
  // isSuperAdmin below: the portal label, the bottom sidebar section's
  // title ("Super Admin" instead of "Admin" — asked for explicitly
  // 2026-09-03, so the section housing account-wide/destructive tools
  // reads as clearly super-admin-flavored even though every regular admin
  // already has Activity Log/Settings/Log Out too), and — added the same
  // day as the section-title rename — one extra nav item in that section,
  // "Deleted Items" (app/admin/deleted-items). `sections` moved from
  // module scope into the function body so it can be built per-request off
  // `profile`; app/admin/deleted-items/page.tsx enforces the Deleted Items
  // restriction server-side too (redirects a regular admin who navigates
  // there directly), so hiding the link here is only the visible half of
  // that particular gate, not the real one — the section *title*, unlike
  // that link, has no access implication of its own to enforce elsewhere.
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
  const portalLabel = isSuperAdmin ? 'Super Admin Portal' : 'Admin Portal'

  const sections: NavSection[] = baseSections.map((section) =>
    section.title === 'Admin' && isSuperAdmin
      ? {
          ...section,
          title: 'Super Admin',
          items: [
            { label: 'Deleted Items', href: '/admin/deleted-items', icon: 'trash' },
            ...section.items,
          ],
        }
      : section
  )

  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel={portalLabel} />
      <main className="min-w-0 flex-1 bg-[#faf9fc] dark:bg-gray-950 px-4 pb-8 pt-20 lg:ml-64 lg:px-8 lg:pt-8">{children}</main>
    </div>
  )
}
