import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClassroomAnnouncements } from '@/components/teacher/classroom-announcements'
import { milestoneCategoryOrder } from '@/lib/milestones'
import { todayIso, manilaHour } from '@/lib/format'

function greeting() {
  const hour = manilaHour()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function TeacherDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: students }, { data: todayAttendance }, { data: milestones }, { data: announcementRows }] =
    await Promise.all([
      supabase.from('profiles').select('first_name, last_name').eq('id', user?.id ?? '').single(),
      supabase.from('students').select('id, first_name, last_name'),
      supabase.from('attendance').select('student_id, status').eq('date', todayIso()),
      supabase.from('milestones').select('student_id, category'),
      supabase
        .from('announcements')
        .select('id, title, body, created_at, profiles(first_name, last_name)')
        .eq('target_role', 'parent')
        .order('created_at', { ascending: false })
        .limit(5)
        .returns<
          { id: string; title: string; body: string; created_at: string; profiles: { first_name: string; last_name: string } | null }[]
        >(),
    ])

  const roster = students ?? []
  const todayStatusByStudent: Record<string, string> = {}
  for (const a of todayAttendance ?? []) todayStatusByStudent[a.student_id] = a.status

  const presentCount = Object.values(todayStatusByStudent).filter((s) => s === 'present').length
  const absentCount = Object.values(todayStatusByStudent).filter((s) => s === 'absent').length
  const lateCount = Object.values(todayStatusByStudent).filter((s) => s === 'late').length

  const domainsByStudent = new Map<string, Set<string>>()
  for (const m of milestones ?? []) {
    const set = domainsByStudent.get(m.student_id) ?? new Set<string>()
    set.add(m.category)
    domainsByStudent.set(m.student_id, set)
  }
  const pendingStudents = roster.filter((s) => (domainsByStudent.get(s.id)?.size ?? 0) < milestoneCategoryOrder.length)

  const announcements = (announcementRows ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_at: a.created_at,
    posted_by_name: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'Staff',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">
          {greeting()}, {profile?.first_name} {profile?.last_name}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Here is an overview of your classroom for today.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attendance</h2>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">
              {roster.length > 0 ? Math.round((presentCount / roster.length) * 100) : 0}%
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {presentCount} <span className="text-base font-normal text-gray-500 dark:text-gray-400">/ {roster.length} Present</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {absentCount} Absent, {lateCount} Late
          </p>
          <Link
            href="/teacher/attendance"
            className="mt-4 inline-block rounded-lg border border-[#0b1b62] dark:border-indigo-300 px-4 py-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62]/5"
          >
            Take Attendance →
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Milestones</h2>
            {pendingStudents.length > 0 && (
              <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-300">Due Soon</span>
            )}
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {pendingStudents.length} <span className="text-base font-normal text-gray-500 dark:text-gray-400">Students</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Have incomplete 6-domain evaluations</p>
          <a
            href="#assessments"
            className="mt-4 inline-block rounded-lg bg-[#e6007e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c9006e]"
          >
            Complete Evaluations →
          </a>
        </div>
      </div>

      <ClassroomAnnouncements announcements={announcements} viewAllHref="/teacher/announcement" />

      <div id="assessments" className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pending Student Assessments (6 Domains of Learning)</h2>
        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
          {roster.map((s) => {
            const domains = domainsByStudent.get(s.id)?.size ?? 0
            return (
              <div key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {s.first_name} {s.last_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{domains}/{milestoneCategoryOrder.length} Domains Complete</p>
                </div>
                <Link
                  href={`/teacher/student-dashboard?student=${s.id}`}
                  className="rounded-lg bg-[#e6007e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c9006e]"
                >
                  Assess Now
                </Link>
              </div>
            )
          })}
          {roster.length === 0 && <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No students on file yet.</p>}
        </div>
      </div>
    </div>
  )
}
