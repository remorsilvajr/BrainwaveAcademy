'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, ClipboardList, User as UserIcon } from 'lucide-react'
import { recordAttendance, submitMilestoneAssessment } from '@/app/teacher/student-dashboard/actions'
import { milestoneCategoryLabels, milestoneCategoryOrder } from '@/lib/milestones'
import { formatDateLong, todayIso } from '@/lib/format'
import { AvatarEditor } from '@/components/ui/avatar-editor'

type Student = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  avatar_url: string | null
}
type AttendanceRow = { id: string; date: string; status: string }
type MilestoneRow = { id: string; category: string; assessment_date: string; notes: string }

const attendanceStatusMeta: Record<string, string> = {
  present: 'text-green-600 bg-green-50',
  absent: 'text-red-600 bg-red-50',
  late: 'text-amber-600 bg-amber-50',
}

export function StudentDashboardContent({
  student,
  attendance,
  milestones,
  avatarEditor,
  readOnly = false,
}: {
  student: Student
  attendance: AttendanceRow[]
  milestones: MilestoneRow[]
  // When provided, the header avatar becomes an upload/remove control
  // instead of a read-only display - used by admin (full permissions),
  // deliberately not by teacher (view-only per the current product rules).
  // Bound Server Actions (e.g. updateStudentAvatar.bind(null, studentId)) so
  // the Server Component page can pass them straight through as props.
  avatarEditor?: {
    onFileSelected: (formData: FormData) => Promise<string>
    onRemove: () => Promise<void>
  }
  // Parent view: no attendance-marking or assessment-editing controls —
  // parents have SELECT-only RLS on attendance/milestones, so those
  // mutations would fail anyway. Teacher/admin both omit this (default
  // false) since they hold the only write access to these tables.
  readOnly?: boolean
}) {
  const router = useRouter()
  const fullName = `${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''} ${student.last_name}`

  const [avatarUrl, setAvatarUrl] = useState(student.avatar_url)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const [isMarking, setIsMarking] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const todayRecord = attendance.find((a) => a.date === todayIso())

  const [assessingCategory, setAssessingCategory] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false)
  const [assessmentError, setAssessmentError] = useState('')

  const latestByCategory = new Map<string, MilestoneRow>()
  for (const m of milestones) {
    if (!latestByCategory.has(m.category)) latestByCategory.set(m.category, m)
  }
  const completedCount = latestByCategory.size
  const latestOverall = milestones[0] ?? null

  async function handleAvatarSelected(file: File) {
    if (!avatarEditor) return
    setIsSavingAvatar(true)
    setAvatarError('')
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const newUrl = await avatarEditor.onFileSelected(formData)
      setAvatarUrl(newUrl)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  async function handleAvatarRemove() {
    if (!avatarEditor) return
    setIsSavingAvatar(true)
    setAvatarError('')
    try {
      await avatarEditor.onRemove()
      setAvatarUrl(null)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  async function handleMarkAttendance(status: string) {
    setIsMarking(true)
    setAttendanceError('')
    try {
      await recordAttendance({ student_id: student.id, date: todayIso(), status })
      router.refresh()
    } catch (err) {
      setAttendanceError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsMarking(false)
    }
  }

  function openAssessment(category: string) {
    setAssessingCategory(category)
    setNotes(latestByCategory.get(category)?.notes ?? '')
    setAssessmentError('')
  }

  async function handleSubmitAssessment(category: string) {
    setIsSubmittingAssessment(true)
    setAssessmentError('')
    try {
      await submitMilestoneAssessment({
        student_id: student.id,
        category,
        assessment_date: todayIso(),
        notes,
      })
      setAssessingCategory(null)
      setNotes('')
      router.refresh()
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmittingAssessment(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6">
        {avatarEditor ? (
          <div>
            <AvatarEditor
              imageUrl={avatarUrl}
              onFileSelected={handleAvatarSelected}
              onRemove={avatarUrl ? handleAvatarRemove : undefined}
              disabled={isSavingAvatar}
              sizeClassName="h-16 w-16"
            />
            {avatarError && <p className="mt-1 max-w-[64px] text-center text-[10px] text-red-600">{avatarError}</p>}
          </div>
        ) : avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <UserIcon className="h-7 w-7" />
          </span>
        )}
        <div>
          <p className="text-lg font-bold text-gray-900">{fullName}</p>
          <p className="mt-1 text-sm text-gray-500">
            {formatDateLong(student.date_of_birth)} &middot; <span className="capitalize">{student.gender}</span> &middot;{' '}
            <span className="capitalize">{student.enrollment_status}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
          {todayRecord ? (
            <p className="mt-3 text-sm text-gray-600">
              Marked{' '}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${attendanceStatusMeta[todayRecord.status]}`}>
                {todayRecord.status}
              </span>{' '}
              for today.
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Not marked for today.</p>
          )}
          {attendanceError && <p className="mt-2 text-sm text-red-600">{attendanceError}</p>}
          {!readOnly && (
            <div className="mt-4 flex gap-2">
              {['present', 'late', 'absent'].map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={isMarking}
                  onClick={() => handleMarkAttendance(status)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize disabled:opacity-60 ${
                    todayRecord?.status === status
                      ? 'border-[#0b1b62] bg-[#0b1b62] text-white'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Latest Assessment</h2>
          {latestOverall ? (
            <>
              <p className="mt-3 text-sm font-semibold text-gray-900">
                {milestoneCategoryLabels[latestOverall.category]}
              </p>
              <p className="mt-1 text-xs text-gray-400">{formatDateLong(latestOverall.assessment_date)}</p>
              <p className="mt-2 text-sm text-gray-600">{latestOverall.notes}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No assessments on file yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Development Milestone Tracker</h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            {completedCount}/{milestoneCategoryOrder.length} Domains Assessed
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {milestoneCategoryOrder.map((category) => {
            const latest = latestByCategory.get(category)
            return (
              <div key={category} className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900">{milestoneCategoryLabels[category]}</p>
                {latest ? (
                  <>
                    <p className="mt-1 text-xs text-gray-400">{formatDateLong(latest.assessment_date)}</p>
                    <p className="mt-1 text-xs text-gray-500">{latest.notes}</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Not yet assessed</p>
                )}

                {readOnly ? null : assessingCategory === category ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Assessment notes…"
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-700 focus:border-[#0b1b62] focus:outline-none"
                    />
                    {assessmentError && <p className="text-xs text-red-600">{assessmentError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAssessingCategory(null)}
                        disabled={isSubmittingAssessment}
                        className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitAssessment(category)}
                        disabled={isSubmittingAssessment}
                        className="flex-1 rounded-lg bg-[#e6007e] py-1.5 text-xs font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
                      >
                        {isSubmittingAssessment ? 'Saving…' : 'Submit'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAssessment(category)}
                    className="mt-3 rounded-lg bg-[#e6007e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c9006e]"
                  >
                    {latest ? 'Edit Assessment' : 'Assess Now'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#e6007e]" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Daily Attendance</h2>
        </div>
        {attendance.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No records yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {attendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarCheck className="h-4 w-4 text-gray-400" />
                  {formatDateLong(a.date)}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${attendanceStatusMeta[a.status]}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
