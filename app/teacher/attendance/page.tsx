import { createClient } from '@/lib/supabase/server'
import { RosterCheckin } from '@/components/teacher/roster-checkin'
import { DateSelector } from '@/components/teacher/date-selector'
import { todayIso } from '@/lib/format'

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const today = todayIso()
  const selectedDate = dateParam ?? today

  const supabase = await createClient()

  const [{ data: students }, { data: attendance }] = await Promise.all([
    supabase.from('students').select('id, first_name, last_name').order('first_name', { ascending: true }),
    supabase.from('attendance').select('student_id, status').eq('date', selectedDate),
  ])

  const statusByStudent: Record<string, string> = {}
  for (const a of attendance ?? []) statusByStudent[a.student_id] = a.status

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mark today&apos;s attendance, or look back at a past date.</p>
        </div>
        <DateSelector date={selectedDate} basePath="/teacher/attendance" />
      </div>

      <RosterCheckin
        students={students ?? []}
        statusByStudent={statusByStudent}
        date={selectedDate}
        readOnly={selectedDate !== today}
      />
    </div>
  )
}
