import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StudentDashboardContent } from '@/components/teacher/student-dashboard-content'
import { StudentSelector } from '@/components/teacher/student-selector'
import { updateStudentAvatar, removeStudentAvatar } from '@/app/admin/students/actions'

export default async function AdminStudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentParam } = await searchParams
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .order('first_name', { ascending: true })

  const selectedId = studentParam ?? students?.[0]?.id ?? null

  if (!selectedId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62]">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Attendance, assessments, and milestones per student.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No students on file yet.{' '}
          <Link href="/admin/students" className="font-semibold text-[#00a3e0] hover:underline">
            View Students
          </Link>
        </div>
      </div>
    )
  }

  const [{ data: student }, { data: attendance }, { data: milestones }] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, middle_name, last_name, date_of_birth, gender, enrollment_status, avatar_url')
      .eq('id', selectedId)
      .single(),
    supabase
      .from('attendance')
      .select('id, date, status')
      .eq('student_id', selectedId)
      .order('date', { ascending: false })
      .limit(14),
    supabase
      .from('milestones')
      .select('id, category, assessment_date, notes')
      .eq('student_id', selectedId)
      .order('assessment_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62]">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Attendance, assessments, and milestones per student.</p>
        </div>
        <StudentSelector students={students ?? []} selectedId={selectedId} basePath="/admin/student-dashboard" />
      </div>

      {student && (
        <StudentDashboardContent
          student={student}
          attendance={attendance ?? []}
          milestones={milestones ?? []}
          avatarEditor={{
            onFileSelected: updateStudentAvatar.bind(null, selectedId),
            onRemove: removeStudentAvatar.bind(null, selectedId),
          }}
        />
      )}
    </div>
  )
}
