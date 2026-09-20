import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MilestoneReportView } from '@/components/admin/milestone-report-view'

export default async function StudentMilestoneReportPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('first_name, middle_name, last_name, student_id, date_of_birth, gender, enrollment_status, classroom_id')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) {
    notFound()
  }

  // Unbounded, unlike the dashboard widget's `.limit(14)` — a report should
  // cover everything on file, not just a recent-activity preview.
  const [{ data: classroom }, { data: attendance }, { data: milestones }] = await Promise.all([
    student.classroom_id
      ? supabase.from('classrooms').select('name').eq('id', student.classroom_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('attendance').select('date, status').eq('student_id', studentId).order('date', { ascending: false }),
    supabase
      .from('milestones')
      .select('category, assessment_date, notes')
      .eq('student_id', studentId)
      .order('assessment_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  // One row per category — first match wins since milestones are ordered
  // newest-first, same reduction as StudentDashboardContent's
  // `latestByCategory` map.
  const milestonesByCategory: Record<string, { assessmentDate: string; notes: string }> = {}
  for (const m of milestones ?? []) {
    if (!milestonesByCategory[m.category]) {
      milestonesByCategory[m.category] = { assessmentDate: m.assessment_date, notes: m.notes }
    }
  }

  const studentName = `${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''} ${student.last_name}`

  return (
    <MilestoneReportView
      backHref="/admin/students"
      data={{
        studentName,
        studentAccountId: student.student_id,
        dateOfBirth: student.date_of_birth,
        gender: student.gender,
        classroomName: classroom?.name ?? null,
        enrollmentStatus: student.enrollment_status,
        milestonesByCategory,
        attendance: attendance ?? [],
      }}
    />
  )
}
