import { Sidebar, type NavSection } from '@/components/sidebar'

const sections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/admin' },
      { label: 'Announcement', href: '/admin/announcement' },
      { label: 'User Management', href: '/admin/user-management' },
      { label: 'Create New Account', href: '/admin/create-new-account' },
      { label: 'Applications', href: '/admin/applications' },
      { label: 'Students', href: '/admin/students' },
      { label: 'Student Dashboard', href: '/admin/student-dashboard' },
      { label: 'Settings', href: '/admin/settings' },
      { label: 'Log Out', isLogout: true },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar sections={sections} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
