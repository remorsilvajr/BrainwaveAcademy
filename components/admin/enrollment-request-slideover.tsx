'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ShieldCheck, Send, X, AlertTriangle } from 'lucide-react'
import { approveApplication, dismissApplication } from '@/app/admin/enroll-a-student/actions'
import { calculateAge, formatDateLong, formatStatus } from '@/lib/format'
import { Modal } from '@/components/ui/modal'

type Application = {
  id: string
  status: string
  reviewed_at: string | null
  student_first_name: string
  student_middle_name: string | null
  student_last_name: string
  student_dob: string
  student_gender: string
  parent_first_name: string
  parent_middle_name: string | null
  parent_last_name: string
  parent_dob: string
  parent_relationship: string
  parent_contact_number: string
  parent_email: string
}

type PendingAction = 'approve' | 'dismiss' | null

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 py-3 last:border-b-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  )
}

export function EnrollmentRequestSlideover({
  application,
  onClose,
}: {
  application: Application
  onClose: () => void
}) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<'approved' | 'dismissed' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const studentName = `${application.student_first_name} ${application.student_last_name}`
  const alreadyDecided = application.status !== 'pending_review'

  async function handleConfirmedApprove() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await approveApplication(application.id)
      setResult('approved')
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPendingAction(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirmedDismiss() {
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await dismissApplication(application.id)
      setResult('dismissed')
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPendingAction(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Landing Page Request:</h2>
            <p className="text-lg font-semibold text-[#e6007e]">{studentName}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {result ? (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-4 text-center">
              <p className="font-medium text-green-800">
                {result === 'approved'
                  ? `Approved! ${application.parent_first_name} has been notified by email.`
                  : 'Request dismissed.'}
              </p>
            </div>
          ) : (
            <>
              {alreadyDecided && (
                <div
                  className={`mb-4 rounded-lg p-3 text-sm font-medium ${
                    application.status === 'approved'
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-700'
                      : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  This request was {formatStatus(application.status).toLowerCase()}
                  {application.reviewed_at ? ` on ${formatDateLong(application.reviewed_at)}` : ''}.
                </div>
              )}

              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Submitted Information Check
              </p>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4">
                <InfoRow label="Student Full Name" value={studentName} />
                <InfoRow label="Student Date of Birth" value={formatDateLong(application.student_dob)} />
                <InfoRow label="Student Age" value={`${calculateAge(application.student_dob)} years old`} />
                <InfoRow
                  label="Gender"
                  value={application.student_gender.charAt(0).toUpperCase() + application.student_gender.slice(1)}
                />
                <InfoRow
                  label="Parent/Guardian Name"
                  value={`${application.parent_first_name} ${application.parent_last_name}`}
                />
                <InfoRow label="Parent Date of Birth" value={formatDateLong(application.parent_dob)} />
                <InfoRow label="Relationship" value={application.parent_relationship} />
                <InfoRow label="Contact Number" value={application.parent_contact_number} />
                <InfoRow label="Contact Email" value={application.parent_email} />
              </div>

              {!alreadyDecided && pendingAction === null && (
                <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 dark:bg-sky-950/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <p className="text-sm font-semibold text-sky-900">Automated Workflow Preview</p>
                  </div>
                  <p className="mb-2 text-sm text-sky-800">Approving this request will instantly:</p>
                  <ul className="space-y-2 text-sm text-sky-800">
                    <li className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Create a parent account for {application.parent_email} with a temporary
                      password (skipped if this parent already has an account for a sibling).
                    </li>
                    <li className="flex items-start gap-2">
                      <Send className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Send an automated email with login details to {application.parent_email}.
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-sky-700 dark:text-sky-300">
                    The student record isn&apos;t created yet — that happens in Applications, once
                    the parent uploads documents and they&apos;re verified.
                  </p>
                </div>
              )}

              {pendingAction && (
                <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-semibold text-amber-900">Please confirm</p>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {pendingAction === 'approve'
                      ? `Are you sure you want to approve this request? This will create a parent account and email ${application.parent_email} immediately.`
                      : 'Are you sure you want to reject this request? This cannot be undone from here.'}
                  </p>
                </div>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 p-6">
          {result ? (
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Close
            </button>
          ) : alreadyDecided ? (
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            >
              Close
            </button>
          ) : pendingAction === 'dismiss' ? (
            <>
              <button
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedDismiss}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Working…' : 'Yes, Reject Request'}
              </button>
            </>
          ) : pendingAction === 'approve' ? (
            <>
              <button
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedApprove}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
              >
                {isSubmitting ? 'Working…' : 'Yes, Approve & Send Email'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPendingAction('dismiss')}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Dismiss Request
              </button>
              <button
                onClick={() => setPendingAction('approve')}
                className="flex-1 rounded-lg bg-[#e6007e] py-3 text-sm font-semibold text-white hover:bg-[#c9006e]"
              >
                Confirm Approval &amp; Dispatch Email
              </button>
            </>
          )}
        </div>
    </Modal>
  )
}
