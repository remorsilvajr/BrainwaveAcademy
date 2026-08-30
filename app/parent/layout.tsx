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

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Sourced from `applications.created_parent_id`, not `parent_student` —
  // this needs to cover a child anywhere in the pipeline (in-progress
  // enrollment, documents pending) not just ones that already have a full
  // `students` row, since that's the whole point of the selector: it also
  // drives Requirements/Enrollment Status, which are about children who
  // aren't fully enrolled yet.
  const [{ data: profile }, { data: applications }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user?.id ?? '')
      .single(),
    supabase
      .from('applications')
      .select('id, student_first_name, student_last_name')
      .eq('created_parent_id', user?.id ?? '')
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
      <div className="ml-64 flex-1">
        <ParentTopBar
          sections={sections}
          students={students}
          parent={{
            first_name: profile?.first_name ?? '',
            last_name: profile?.last_name ?? '',
            avatar_url: profile?.avatar_url ?? null,
          }}
        />
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
