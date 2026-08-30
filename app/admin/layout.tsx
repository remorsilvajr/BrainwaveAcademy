import { Sidebar, type NavSection } from '@/components/sidebar'

const sections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
      { label: 'Announcement', href: '/admin/announcement', icon: 'announcement' },
      { label: 'User Management', href: '/admin/user-management', icon: 'users' },
      { label: 'Create New Account', href: '/admin/create-new-account', icon: 'checklist' },
      { label: 'Enroll A Student', href: '/admin/enroll-a-student', icon: 'userPlus' },
      { label: 'Applications', href: '/admin/applications', icon: 'file' },
    ],
  },
  {
    title: 'Student',
    items: [
      { label: 'Students', href: '/admin/students', icon: 'user' },
      { label: 'Student Dashboard', href: '/admin/student-dashboard', icon: 'graduationCap' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'My Profile', href: '/admin/my-profile', icon: 'user' },
      { label: 'Settings', href: '/admin/settings', icon: 'settings' },
    ],
  },
  {
    title: 'Admin',
    items: [{ label: 'Log Out', isLogout: true, icon: 'logout' }],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel="Admin Portal" />
      <main className="flex-1 bg-[#faf9fc] p-8">{children}</main>
    </div>
  )
}
