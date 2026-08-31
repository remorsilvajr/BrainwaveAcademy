import { Sidebar, type NavSection } from '@/components/sidebar'
import { ParentTopBar } from '@/components/parent/parent-topbar'
import { createClient } from '@/lib/supabase/server'

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
      { label: 'Enrollment Profile', href: '/parent/students' },
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

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Matches on created_parent_id OR parent_email, not just created_parent_id
  // — that column is only populated once admin approves the enrollment
  // *request* itself (Enroll A Student), so a parent who just submitted a
  // new child would otherwise have no way to even see it in the selector
  // until admin acts on it. Requirements deliberately keeps the narrower
  // created_parent_id-only filter (document upload genuinely shouldn't be
  // possible before the request is approved), but the selector, Dashboard,
  // Enrollment Status, and Student Profile all need to reflect a
  // still-pending submission too.
  const [{ data: profile }, { data: applications }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user?.id ?? '')
      .single(),
    supabase
      .from('applications')
      .select('id, student_first_name, student_last_name')
      .or(`created_parent_id.eq.${user?.id ?? ''},parent_email.eq.${user?.email ?? ''}`)
      .order('submitted_at', { ascending: true }),
  ])

  const students = (applications ?? []).map((a) => ({
    id: a.id,
    first_name: a.student_first_name,
    last_name: a.student_last_name,
  }))

  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel="Parent Portal" />
      <div className="min-w-0 flex-1 pt-14 lg:ml-64 lg:pt-0">
        <ParentTopBar
          sections={sections}
          students={students}
          parent={{
            first_name: profile?.first_name ?? '',
            last_name: profile?.last_name ?? '',
            avatar_url: profile?.avatar_url ?? null,
          }}
        />
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  )
}
