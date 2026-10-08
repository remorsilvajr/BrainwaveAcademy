'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DobSelect } from '@/components/ui/dob-select'
import { addPendingFee } from '@/app/admin/payments/actions'
import { validateFeeAmount, validateFeeDueDate } from '@/lib/fees'
import { todayIso } from '@/lib/format'

type Classroom = { id: string; name: string }

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400'

// Creates a new pending (unpaid) fee for a student, tied to a classroom —
// the one thing admin couldn't do before: every other fee only ever came
// from auto-generation at classroom assignment, or an already-paid manual
// cash record. Opened from the Student Record modal's Balance tab or a row of
// Payments > Student Balances, so the student is already fixed; only
// classroom/type/amount/due date are picked (the student's class preselected).
export function AddFeeModal({
  studentId,
  classrooms,
  onClose,
  studentName,
  defaultClassroomId,
}: {
  studentId: string
  classrooms: Classroom[]
  onClose: () => void
  studentName?: string
  defaultClassroomId?: string | null
}) {
  const router = useRouter()
  const [classroomId, setClassroomId] = useState(defaultClassroomId ?? '')
  const [feeType, setFeeType] = useState('tuition')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [duePartial, setDuePartial] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [confirmingTuition, setConfirmingTuition] = useState(false)

  function validate(): string | null {
    if (!classroomId) return 'Select a classroom.'
    if (duePartial) return 'Pick the day, month, and year of the due date, or leave it blank.'
    return validateFeeAmount(Number(amount)) ?? validateFeeDueDate(dueDate || null)
  }

  async function submit(confirmed: boolean) {
    setError('')
    setIsSaving(true)
    try {
      const result = await addPendingFee(studentId, {
        classroomId,
        feeType,
        description: description.trim(),
        amount: Number(amount),
        dueDate: dueDate || null,
        confirmed,
      })
      if (result && 'warning' in result) {
        setConfirmingTuition(true)
        return
      }
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleSubmit() {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    submit(false)
  }

  return (
    <>
      <Modal onClose={onClose} maxWidth="md">
        <div className="border-b border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Fee</h2>
              {studentName && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">For {studentName}</p>}
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Creates a new unpaid fee for this student to pay later. It is not an already-paid record.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <p className="rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              Fee added. The parent has been notified.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Classroom</label>
                <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className={inputClass}>
                  <option value="">Select a classroom…</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Fee Type</label>
                  <select value={feeType} onChange={(e) => setFeeType(e.target.value)} className={inputClass}>
                    <option value="tuition">Tuition</option>
                    <option value="activity">Activity Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Amount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Field trip fee, September tuition"
                  className={inputClass}
                />
              </div>
              <div>
                <DobSelect
                  label="Due date (optional)"
                  defaultValue=""
                  min={`${Number(todayIso().slice(0, 4)) - 1}-01-01`}
                  max={`${Number(todayIso().slice(0, 4)) + 1}-12-31`}
                  onChange={setDueDate}
                  onPartialChange={setDuePartial}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 p-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          {!success && (
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
            >
              {isSaving ? 'Adding…' : 'Add Fee'}
            </button>
          )}
        </div>
      </Modal>

      {confirmingTuition && (
        <ConfirmDialog
          title="Add a second tuition fee?"
          description="This student already has a tuition fee for this classroom, and tuition is a one-time payment. Add another anyway?"
          confirmLabel="Yes, Add Anyway"
          tone="danger"
          isPending={isSaving}
          onConfirm={() => {
            setConfirmingTuition(false)
            submit(true)
          }}
          onCancel={() => setConfirmingTuition(false)}
        />
      )}
    </>
  )
}
