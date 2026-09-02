import { Sidebar, type NavSection } from '@/components/sidebar'

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel="Admin Portal" />
      <main className="min-w-0 flex-1 bg-[#faf9fc] dark:bg-gray-950 px-4 pb-8 pt-20 lg:ml-64 lg:px-8 lg:pt-8">{children}</main>
    </div>
  )
}
