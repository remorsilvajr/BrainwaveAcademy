'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'
import { formatDateLong, calculateAge, todayIso } from '@/lib/format'
import { milestoneCategoryLabels, milestoneCategoryOrder } from '@/lib/milestones'

export type MilestoneReportData = {
  studentName: string
  studentAccountId: string | null
  dateOfBirth: string
  gender: string
  classroomName: string | null
  enrollmentStatus: string
  milestonesByCategory: Record<string, { assessmentDate: string; notes: string } | undefined>
  attendance: { date: string; status: string }[]
  // False for Academic Tutorials / Quiz Bee & Exam Prep (not daily): the
  // attendance section is left out of the report.
  attendanceTracked: boolean
}

const attendanceLabels: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
}

// Same shape as components/payments/receipt-view.tsx — a plain printable
// page (window.print(), print:hidden chrome, print:border-0 shadow-none
// card), not a generated PDF file, for the same reason documented there:
// the browser's own "Print > Save as PDF" already covers it.
export function MilestoneReportView({ data, backHref }: { data: MilestoneReportData; backHref: string }) {
  const attendanceCounts = data.attendance.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const completedCount = milestoneCategoryOrder.filter((c) => data.milestonesByCategory[c]).length

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
          ← Back
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d]"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 print:border-0 print:shadow-none">
        <div className="border-b border-dashed border-gray-200 dark:border-gray-700 pb-4 text-center">
          <p className="text-lg font-bold text-[#0b1b62] dark:text-indigo-300">Brainwave Preschool Academy</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Milestone &amp; Attendance Report</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Student</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {data.studentName} {data.studentAccountId ? `(${data.studentAccountId})` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">Classroom</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{data.classroomName ?? 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Date of Birth (Age)</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatDateLong(data.dateOfBirth)} ({calculateAge(data.dateOfBirth)}y)
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">Enrollment Status</p>
            <p className="font-medium capitalize text-gray-900 dark:text-gray-100">{data.enrollmentStatus}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Development Milestones
            </h2>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {completedCount}/{milestoneCategoryOrder.length} Domains Assessed
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {milestoneCategoryOrder.map((category) => {
              const entry = data.milestonesByCategory[category]
              return (
                <div key={category} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {milestoneCategoryLabels[category]}
                    </p>
                    {entry && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateLong(entry.assessmentDate)}</p>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {entry ? entry.notes : 'Not yet assessed'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {data.attendanceTracked && (
        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Attendance Summary
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {(['present', 'late', 'absent'] as const).map((status) => (
              <div key={status} className="rounded-lg bg-[#faf9fc] dark:bg-gray-800/60 p-3">
                <p className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">{attendanceCounts[status] ?? 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{attendanceLabels[status]}</p>
              </div>
            ))}
          </div>
          {data.attendance.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto print:max-h-none print:overflow-visible">
              <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {data.attendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-gray-600 dark:text-gray-400">{formatDateLong(a.date)}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{attendanceLabels[a.status] ?? a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Generated on {formatDateLong(todayIso())}. Covers all milestone{data.attendanceTracked ? ' and attendance' : ''} records on file to date.
        </p>
      </div>
    </div>
  )
}
