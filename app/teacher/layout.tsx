import { Sidebar, type NavSection } from '@/components/sidebar'

const sections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/teacher' },
      { label: 'Announcement', href: '/teacher/announcement' },
      { label: 'Students', href: '/teacher/students' },
      { label: 'Student Dashboard', href: '/teacher/student-dashboard' },
      { label: 'My Profile', href: '/teacher/my-profile' },
      { label: 'Settings', href: '/teacher/settings' },
      { label: 'Log Out', isLogout: true },
    ],
  },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar sections={sections} />
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  )
}
