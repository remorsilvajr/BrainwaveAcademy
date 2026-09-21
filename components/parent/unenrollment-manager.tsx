'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, CheckCircle2, Clock, Loader2, UserMinus, X, XCircle } from 'lucide-react'
import { cancelUnenrollmentRequest, requestUnenrollment } from '@/app/parent/unenrollment/actions'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DobSelect } from '@/components/ui/dob-select'
import { formatDateLong } from '@/lib/format'
import {
  UNENROLLMENT_REASON_MAX,
  lastDayBounds,
  validateLastDay,
  validateReason,
  type UnenrollmentStatus,
} from '@/lib/unenrollment'

export type UnenrollmentChild = {
  id: string
  name: string
  status: string
  programName: string | null
}

export type UnenrollmentRequestRow = {
  id: string
  student_id: string
  reason: string
  last_day: string
  status: UnenrollmentStatus
  review_note: string | null
  created_at: string
}

function RequestModal({ child, onClose }: { child: UnenrollmentChild; onClose: () => void }) {
  const router = useRouter()
  const bounds = lastDayBounds()
  const [reason, setReason] = useState('')
  const [lastDay, setLastDay] = useState('')
  const [isPartial, setIsPartial] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isRefreshing, startRefresh] = useTransition()

  const busy = isSaving || isRefreshing

  async function handleSubmit() {
    setError('')
    const reasonError = validateReason(reason)
    if (reasonError) return setError(reasonError)
    if (isPartial || !lastDay) return setError('Choose the day, month, and year of the last day.')
    const dayError = validateLastDay(lastDay)
    if (dayError) return setError(dayError)

    setIsSaving(true)
    try {
      const result = await requestUnenrollment(child.id, reason, lastDay)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      startRefresh(() => router.refresh())
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Close once the refresh has landed, so the new "pending" state is what the
  // parent sees behind the modal.
  useEffect(() => {
    if (saved && !isRefreshing) onClose()
  }, [saved, isRefreshing, onClose])

  return (
    <Modal onClose={busy ? () => {} : onClose} maxWidth="lg">
      <div className="flex items-start justify-between border-b border-gray-100 p-6 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Request unenrollment</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{child.name}</p>
        </div>
        <button onClick={onClose} disabled={busy} aria-label="Close" className="text-gray-400 hover:text-gray-600 disabled:opacity-40">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 p-6">
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
          The school reviews every request and will email you the decision. {child.name.split(' ')[0]} stays enrolled until
          it&apos;s approved.
        </p>

        <div>
          <label htmlFor="unenroll-reason" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="unenroll-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={UNENROLLMENT_REASON_MAX}
            placeholder="For example: we are moving to another city."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#0b1b62] focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-indigo-400"
          />
        </div>

        <DobSelect
          label="Last day at school"
          required
          min={bounds.min}
          max={bounds.max}
          onChange={setLastDay}
          onPartialChange={setIsPartial}
        />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      </div>

      <div className="flex gap-3 border-t border-gray-100 p-6 dark:border-gray-800">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={busy || !reason.trim() || !lastDay}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#e6007e] py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </Modal>
  )
}

export function UnenrollmentManager({
  students,
  requests,
}: {
  students: UnenrollmentChild[]
  requests: UnenrollmentRequestRow[]
}) {
  const router = useRouter()
  const [requestFor, setRequestFor] = useState<UnenrollmentChild | null>(null)
  const [cancelling, setCancelling] = useState<UnenrollmentRequestRow | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmCancel() {
    if (!cancelling) return
    setIsCancelling(true)
    setError('')
    try {
      const result = await cancelUnenrollmentRequest(cancelling.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setCancelling(null)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

      {students.map((child) => {
        const own = requests.filter((r) => r.student_id === child.id) // already newest first
        const pending = own.find((r) => r.status === 'pending') ?? null
        const latest = own[0] ?? null
        const withdrawn = child.status === 'withdrawn' || child.status === 'graduated'

        return (
          <div key={child.id} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{child.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{child.programName ?? 'No program assigned yet'}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  withdrawn
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                    : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                }`}
              >
                {child.status}
              </span>
            </div>

            {pending && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  <Clock className="h-4 w-4" />
                  Request pending review
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  Last day: {formatDateLong(pending.last_day)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-200">Reason: {pending.reason}</p>
                <button
                  onClick={() => setCancelling(pending)}
                  className="mt-3 rounded-full border border-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30"
                >
                  Cancel this request
                </button>
              </div>
            )}

            {!pending && latest?.status === 'declined' && !withdrawn && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                <p className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                  Your last request was declined
                </p>
                {latest.review_note && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-red-800 dark:text-red-200">{latest.review_note}</p>
                )}
              </div>
            )}

            {withdrawn && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {child.status === 'graduated' ? 'Graduated' : 'Unenrolled'}
                  {latest?.status === 'approved' ? `, last day ${formatDateLong(latest.last_day)}` : ''}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Records, payments, and receipts stay available in your portal.
                </p>
              </div>
            )}

            {!withdrawn && !pending && (
              <button
                onClick={() => setRequestFor(child)}
                className="mt-4 flex items-center gap-2 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <UserMinus className="h-4 w-4" />
                Request unenrollment
              </button>
            )}
          </div>
        )
      })}

      {requestFor && <RequestModal child={requestFor} onClose={() => setRequestFor(null)} />}

      {cancelling && (
        <ConfirmDialog
          title="Cancel this request?"
          description="Your unenrollment request will be withdrawn and your child stays enrolled."
          confirmLabel="Yes, Cancel It"
          tone="danger"
          isPending={isCancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelling(null)}
        />
      )}
    </div>
  )
}
