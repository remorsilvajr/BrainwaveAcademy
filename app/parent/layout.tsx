import { Sidebar, type NavSection } from '@/components/sidebar'

const sections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/parent' },
      { label: 'Announcement', href: '/parent/announcement' },
    ],
  },
  {
    title: 'Enrollment',
    items: [
      { label: 'Enroll A Student', href: '/parent/enroll-a-student' },
      { label: 'Requirements', href: '/parent/requirements' },
      { label: 'Payments', href: '/parent/payments' },
      { label: 'Enrollment Status', href: '/parent/enrollment-status' },
    ],
  },
  {
    title: 'Student',
    items: [
      { label: 'Students', href: '/parent/students' },
      { label: 'Student Dashboard', href: '/parent/student-dashboard' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'My Profile', href: '/parent/my-profile' },
      { label: 'Settings', href: '/parent/settings' },
      { label: 'Log Out', isLogout: true },
    ],
  },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar sections={sections} />
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  )
}
