'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, User as UserIcon } from 'lucide-react'
import { calculateAge, formatCurrency } from '@/lib/format'
import { classroomAgeRangeLabel, feeDueDateBounds, validateFeeDueDate } from '@/lib/classrooms'
import { Modal } from '@/components/ui/modal'
import { DobSelect } from '@/components/ui/dob-select'
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select'
import {
  assignLeadTeacher,
  removeLeadTeacher,
  addAssistantTeacher,
  removeAssistantTeacher,
  updateFeeDueDates,
} from '@/app/admin/classrooms/actions'
import type { ClassroomRow } from '@/components/admin/classrooms-grid'

type Tab = 'roster' | 'teachers' | 'fees'

// One fee: its fixed amount on the left, its editable due date on the right as
// the same Day/Month/Year dropdowns the birthday fields use (a native date input
// was unreliable here). DobSelect seeds itself once on mount, so Clear remounts
// it with an empty seed. `onPartialChange` lets Save refuse a half-picked date
// instead of quietly treating it as cleared.
function DueDateRow({
  feeLabel,
  feeAmount,
  dueLabel,
  initialValue,
  min,
  max,
  onChange,
  onPartialChange,
}: {
  feeLabel: string
  feeAmount: number
  dueLabel: string
  initialValue: string
  min: string
  max: string
  onChange: (value: string) => void
  onPartialChange: (isPartial: boolean) => void
}) {
  const [seed, setSeed] = useState(initialValue)
  const [resetKey, setResetKey] = useState(0)
  const [hasValue, setHasValue] = useState(!!initialValue)
  const [isPartial, setIsPartial] = useState(false)

  function handleClear() {
    setSeed('')
    setResetKey((k) => k + 1)
    setHasValue(false)
    setIsPartial(false)
    onChange('')
    onPartialChange(false)
  }

  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[8.5rem_1fr]">
      <div>
        <p className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">{feeLabel}</p>
        <p className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
          {formatCurrency(feeAmount)}
        </p>
      </div>
      <div>
        <DobSelect
          key={resetKey}
          label={dueLabel}
          defaultValue={seed}
          min={min}
          max={max}
          onChange={(value) => {
            setHasValue(!!value)
            onChange(value)
          }}
          onPartialChange={(partial) => {
            setIsPartial(partial)
            onPartialChange(partial)
          }}
        />
        {(hasValue || isPartial) && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-1 text-xs font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline"
          >
            Clear date
          </button>
        )}
      </div>
    </div>
  )
}

export function ClassroomModal({
  classroom,
  teacherOptions,
  onClose,
}: {
  classroom: ClassroomRow
  teacherOptions: SearchableOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('roster')

  const [leadPick, setLeadPick] = useState<string | null>(null)
  const [assistantPick, setAssistantPick] = useState<string | null>(null)
  const [teacherError, setTeacherError] = useState('')
  const [isSavingTeacher, setIsSavingTeacher] = useState(false)

  const [tuitionDue, setTuitionDue] = useState(classroom.tuition_due_date ?? '')
  const [activityDue, setActivityDue] = useState(classroom.activity_due_date ?? '')
  const [tuitionPartial, setTuitionPartial] = useState(false)
  const [activityPartial, setActivityPartial] = useState(false)
  const [feeError, setFeeError] = useState('')
  const [isSavingFees, setIsSavingFees] = useState(false)
  const [feeSaved, setFeeSaved] = useState(false)

  const bounds = feeDueDateBounds()

  const assignedTeacherIds = new Set([
    ...(classroom.lead_teacher_id ? [classroom.lead_teacher_id] : []),
    ...classroom.assistants.map((a) => a.id),
  ])
  const availableForLead = teacherOptions.filter((t) => t.value !== classroom.lead_teacher_id)
  const availableForAssistant = teacherOptions.filter((t) => !assignedTeacherIds.has(t.value))

  async function handleAssignLead() {
    if (!leadPick) return
    setTeacherError('')
    setIsSavingTeacher(true)
    try {
      const result = await assignLeadTeacher(classroom.id, leadPick)
      if (result?.error) {
        setTeacherError(result.error)
        return
      }
      setLeadPick(null)
      router.refresh()
    } catch {
      setTeacherError('Something went wrong.')
    } finally {
      setIsSavingTeacher(false)
    }
  }

  async function handleRemoveLead() {
    setTeacherError('')
    setIsSavingTeacher(true)
    try {
      const result = await removeLeadTeacher(classroom.id)
      if (result?.error) {
        setTeacherError(result.error)
        return
      }
      router.refresh()
    } catch {
      setTeacherError('Something went wrong.')
    } finally {
      setIsSavingTeacher(false)
    }
  }

  async function handleAddAssistant() {
    if (!assistantPick) return
    setTeacherError('')
    setIsSavingTeacher(true)
    try {
      const result = await addAssistantTeacher(classroom.id, assistantPick)
      if (result?.error) {
        setTeacherError(result.error)
        return
      }
      setAssistantPick(null)
      router.refresh()
    } catch {
      setTeacherError('Something went wrong.')
    } finally {
      setIsSavingTeacher(false)
    }
  }

  async function handleRemoveAssistant(teacherId: string) {
    setTeacherError('')
    setIsSavingTeacher(true)
    try {
      const result = await removeAssistantTeacher(classroom.id, teacherId)
      if (result?.error) {
        setTeacherError(result.error)
        return
      }
      router.refresh()
    } catch {
      setTeacherError('Something went wrong.')
    } finally {
      setIsSavingTeacher(false)
    }
  }

  async function handleSaveFees() {
    setFeeError('')
    setFeeSaved(false)
    if (tuitionPartial || activityPartial) {
      setFeeError('Pick the day, month, and year for each due date, or clear it.')
      return
    }
    // Same check the server action runs, but only for a date being changed,
    // so a typo is flagged instantly.
    for (const [value, stored] of [
      [tuitionDue, classroom.tuition_due_date ?? ''],
      [activityDue, classroom.activity_due_date ?? ''],
    ]) {
      if (value && value !== stored) {
        const message = validateFeeDueDate(value)
        if (message) {
          setFeeError(message)
          return
        }
      }
    }
    setIsSavingFees(true)
    try {
      const result = await updateFeeDueDates(classroom.id, {
        tuition_due_date: tuitionDue || null,
        activity_due_date: activityDue || null,
      })
      if (result?.error) {
        setFeeError(result.error)
        return
      }
      setFeeSaved(true)
      router.refresh()
    } catch {
      setFeeError('Something went wrong.')
    } finally {
      setIsSavingFees(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'roster', label: `Students (${classroom.roster.length})` },
    { key: 'teachers', label: 'Teachers' },
    { key: 'fees', label: 'Fee Schedule' },
  ]

  return (
    <Modal onClose={onClose} maxWidth="lg">
      <div className="border-b border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{classroom.name}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{classroomAgeRangeLabel(classroom)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex gap-4 border-b border-gray-100 dark:border-gray-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                // The fee pickers unmount with their tab and re-seed from tuitionDue/activityDue,
                // so a half-picked date is lost on leaving; drop its stale flag too.
                setTuitionPartial(false)
                setActivityPartial(false)
              }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                tab === t.key ? 'border-[#e6007e] text-[#e6007e]' : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'roster' && (
          <div className="space-y-2">
            {classroom.roster.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No students assigned yet. Assign a student to this classroom from their record in Students.
              </p>
            ) : (
              classroom.roster.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  {s.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                      <UserIcon className="h-4 w-4" />
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {s.student_id ?? '-'} · {calculateAge(s.date_of_birth)}y
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'teachers' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Lead Teacher</h3>
              {classroom.leadTeacherName ? (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{classroom.leadTeacherName}</span>
                  <button
                    onClick={handleRemoveLead}
                    disabled={isSavingTeacher}
                    className="rounded-full border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <SearchableSelect
                      options={availableForLead}
                      value={leadPick}
                      onChange={setLeadPick}
                      placeholder="Select a teacher…"
                    />
                  </div>
                  <button
                    onClick={handleAssignLead}
                    disabled={!leadPick || isSavingTeacher}
                    className="rounded-lg bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Assistant Teachers
              </h3>
              <div className="mt-2 space-y-2">
                {classroom.assistants.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.name}</span>
                    <button
                      onClick={() => handleRemoveAssistant(a.id)}
                      disabled={isSavingTeacher}
                      className="rounded-full border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <SearchableSelect
                    options={availableForAssistant}
                    value={assistantPick}
                    onChange={setAssistantPick}
                    placeholder="Select a teacher to add…"
                  />
                </div>
                <button
                  onClick={handleAddAssistant}
                  disabled={!assistantPick || isSavingTeacher}
                  className="rounded-lg border border-[#0b1b62] dark:border-indigo-300 px-4 py-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62]/5 disabled:opacity-60"
                >
                  Add Assistant
                </button>
              </div>
            </div>

            {teacherError && (
              <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{teacherError}</p>
            )}
          </div>
        )}

        {tab === 'fees' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Only the due dates can be changed, from today through December 31, {bounds.max.slice(0, 4)}. Fee amounts are
              fixed. A new due date applies to students assigned to this program from now on; fees already generated for
              currently-assigned students keep their existing due dates.
            </p>
            <div className="space-y-4">
              <DueDateRow
                feeLabel="Tuition Fee"
                feeAmount={classroom.tuition_fee}
                dueLabel="Tuition Due Date"
                initialValue={tuitionDue}
                min={bounds.min}
                max={bounds.max}
                onChange={setTuitionDue}
                onPartialChange={setTuitionPartial}
              />
              <DueDateRow
                feeLabel="Activity Fee"
                feeAmount={classroom.activity_fee}
                dueLabel="Activity Fee Due Date"
                initialValue={activityDue}
                min={bounds.min}
                max={bounds.max}
                onChange={setActivityDue}
                onPartialChange={setActivityPartial}
              />
            </div>

            {feeError && (
              <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{feeError}</p>
            )}
            {feeSaved && !feeError && (
              <p className="rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                Due dates saved.
              </p>
            )}

            <button
              onClick={handleSaveFees}
              disabled={isSavingFees}
              className="w-full rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
            >
              {isSavingFees ? 'Saving…' : 'Save Due Dates'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 p-6">
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
