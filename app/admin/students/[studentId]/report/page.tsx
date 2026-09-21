import { notFound } from 'next/navigation'
import { tracksDailyAttendance } from '@/lib/classrooms'
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
  const [{ data: classroom }, { data: attendance }, { data: milestones }, { data: promotions }, { data: allClassrooms }] = await Promise.all([
    student.classroom_id
      ? supabase.from('classrooms').select('name, slug').eq('id', student.classroom_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('attendance').select('date, status').eq('student_id', studentId).order('date', { ascending: false }),
    supabase
      .from('milestones')
      .select('category, assessment_date, notes')
      .eq('student_id', studentId)
      .order('assessment_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('student_promotions')
      .select('school_year, action, from_classroom_id, to_classroom_id')
      .eq('student_id', studentId)
      .order('school_year', { ascending: false }),
    supabase.from('classrooms').select('id, name'),
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

  const classroomNameById = new Map((allClassrooms ?? []).map((c) => [c.id, c.name]))

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
        programHistory: (promotions ?? []).map((p) => {
          const nameOf = (id: string | null) => (id ? (classroomNameById.get(id) ?? 'a program') : 'no program')
          const label =
            p.action === 'promoted'
              ? `Promoted from ${nameOf(p.from_classroom_id)} to ${nameOf(p.to_classroom_id)}`
              : p.action === 'graduated'
                ? `Graduated from ${nameOf(p.from_classroom_id)}`
                : `Stayed in ${nameOf(p.from_classroom_id)}`
          return { schoolYear: p.school_year, label }
        }),
        attendanceTracked: tracksDailyAttendance(classroom),
      }}
    />
  )
}
