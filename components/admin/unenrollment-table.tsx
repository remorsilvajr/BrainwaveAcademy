'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CalendarClock, X } from 'lucide-react'
import { approveUnenrollment, declineUnenrollment } from '@/app/admin/unenrollment/actions'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { usePagination } from '@/lib/use-pagination'
import { compareDates, compareStrings, useSort, type SortOption } from '@/lib/use-sort'
import { formatCurrency, formatDateLong, formatDateShort, roundToCents, todayIso } from '@/lib/format'
import { UNENROLLMENT_REASON_MAX, type FeeDecision, type UnenrollmentStatus } from '@/lib/unenrollment'

export type UnenrollmentAdminRow = {
  id: string
  reason: string
  last_day: string
  status: UnenrollmentStatus
  review_note: string | null
  fee_decision: string | null
  reviewed_at: string | null
  created_at: string
  studentName: string
  studentAccountId: string | null
  studentStatus: string
  programName: string | null
  parentName: string
  parentEmail: string | null
  parentPhone: string | null
  unpaidFees: { id: string; description: string; amount: number; due_date: string | null }[]
}

type Tab = 'pending' | 'handled' | 'all'

const statusStyles: Record<UnenrollmentStatus, string> = {
  pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  approved: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  declined: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
  cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

function ReviewModal({ request, onClose }: { request: UnenrollmentAdminRow; onClose: () => void }) {
  const router = useRouter()
  const isPending = request.status === 'pending'
  const unpaidTotal = roundToCents(request.unpaidFees.reduce((sum, f) => sum + f.amount, 0))
  const hasUnpaid = request.unpaidFees.length > 0
  const lastDayInFuture = request.last_day > todayIso()

  const [feeDecision, setFeeDecision] = useState<FeeDecision | ''>('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState<'approve' | 'decline' | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!confirming) return
    setIsWorking(true)
    setError('')
    try {
      const result =
        confirming === 'approve'
          ? await approveUnenrollment(request.id, feeDecision || null, note)
          : await declineUnenrollment(request.id, note)
      if (result?.error) {
        setError(result.error)
        setConfirming(null)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setConfirming(null)
    } finally {
      setIsWorking(false)
    }
  }

  function askApprove() {
    setError('')
    if (hasUnpaid && !feeDecision) {
      setError('Choose what happens to the unpaid fees first.')
      return
    }
    setConfirming('approve')
  }

  function askDecline() {
    setError('')
    if (note.trim().length < 5) {
      setError('Add a note explaining why this is declined, so the family knows.')
      return
    }
    setConfirming('decline')
  }

  return (
    <>
      <Modal onClose={onClose} maxWidth="2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-[#0b1b62] dark:text-indigo-300">{request.studentName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {request.programName ?? 'No program'} {request.studentAccountId ? `· ${request.studentAccountId}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[request.status]}`}>{request.status}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 dark:text-gray-500">Requested by</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{request.parentName}</p>
              {request.parentEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{request.parentEmail}</p>}
              {request.parentPhone && <p className="text-xs text-gray-500 dark:text-gray-400">{request.parentPhone}</p>}
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-400 dark:text-gray-500">Last day at school</p>
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                <CalendarClock className="h-4 w-4" />
                {formatDateLong(request.last_day)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Requested {formatDateShort(request.created_at)}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Reason</p>
            <p className="whitespace-pre-wrap rounded-lg border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">{request.reason}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Unpaid fees {hasUnpaid ? `(${formatCurrency(unpaidTotal)})` : ''}
            </p>
            {hasUnpaid ? (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                {request.unpaidFees.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {f.description}
                      {f.due_date && <span className="ml-2 text-xs text-gray-400">due {formatDateShort(f.due_date)}</span>}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(f.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No unpaid fees.</p>
            )}
          </div>

          {isPending ? (
            <>
              {lastDayInFuture && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Their last day is {formatDateLong(request.last_day)}. Approving now withdraws them immediately, so you
                  may want to wait until then.
                </p>
              )}

              {hasUnpaid && (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                    What happens to the unpaid fees? <span className="text-red-500">*</span>
                  </legend>
                  <div className="space-y-2">
                    {(
                      [
                        ['keep', 'Keep them collectible', 'The family still owes what was billed. It stays in Outstanding.'],
                        ['waive', 'Waive them', 'Cancel the unpaid fees. They no longer count as owed.'],
                      ] as const
                    ).map(([value, label, help]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                          feeDecision === value
                            ? 'border-[#0b1b62] bg-[#0b1b62]/5 dark:border-indigo-400 dark:bg-indigo-400/10'
                            : 'border-gray-200 hover:border-[#0b1b62]/40 dark:border-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="fee-decision"
                          value={value}
                          checked={feeDecision === value}
                          onChange={() => setFeeDecision(value)}
                          className="mt-1 accent-[#0b1b62]"
                        />
                        <span>
                          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{help}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div>
                <label htmlFor="review-note" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                  Note to the parent <span className="text-xs font-normal text-gray-400">(required to decline)</span>
                </label>
                <textarea
                  id="review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={UNENROLLMENT_REASON_MAX}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#0b1b62] focus:outline-none dark:border-gray-700 dark:text-gray-100 dark:focus:border-indigo-400"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Included in the email the parent receives.</p>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/60">
              {request.reviewed_at && (
                <p className="text-gray-500 dark:text-gray-400">Handled {formatDateShort(request.reviewed_at)}</p>
              )}
              {request.fee_decision && (
                <p className="text-gray-700 dark:text-gray-300">
                  Unpaid fees: {request.fee_decision === 'waive' ? 'waived' : 'kept collectible'}
                </p>
              )}
              {request.review_note && <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">Note: {request.review_note}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 p-6 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          {isPending && (
            <>
              <button
                type="button"
                onClick={askDecline}
                className="rounded-full border border-red-400 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={askApprove}
                className="rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d]"
              >
                Approve &amp; Withdraw
              </button>
            </>
          )}
        </div>
      </Modal>

      {confirming === 'approve' && (
        <ConfirmDialog
          title="Withdraw this student?"
          description={`${request.studentName} will be marked withdrawn and removed from rosters and attendance. ${
            hasUnpaid ? (feeDecision === 'waive' ? `${formatCurrency(unpaidTotal)} in unpaid fees will be waived.` : 'Unpaid fees stay collectible.') : ''
          }`.trim()}
          confirmLabel="Yes, Withdraw"
          tone="danger"
          isPending={isWorking}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'decline' && (
        <ConfirmDialog
          title="Decline this request?"
          description={`${request.studentName} stays enrolled, and ${request.parentName} is emailed your note.`}
          confirmLabel="Yes, Decline"
          tone="danger"
          isPending={isWorking}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  )
}

export function UnenrollmentTable({ requests }: { requests: UnenrollmentAdminRow[] }) {
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const openRequest = openId ? (requests.find((r) => r.id === openId) ?? null) : null

  const counts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    handled: requests.filter((r) => r.status !== 'pending').length,
    all: requests.length,
  }

  const filtered = requests.filter((r) => {
    if (tab === 'pending' && r.status !== 'pending') return false
    if (tab === 'handled' && r.status === 'pending') return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      r.studentName.toLowerCase().includes(term) ||
      r.parentName.toLowerCase().includes(term) ||
      (r.parentEmail ?? '').toLowerCase().includes(term) ||
      r.reason.toLowerCase().includes(term)
    )
  })

  const sortOptions: SortOption<UnenrollmentAdminRow>[] = useMemo(
    () => [
      { value: 'last_day_asc', label: 'Last Day (Soonest)', compare: (a, b) => compareDates(a.last_day, b.last_day) },
      { value: 'created_desc', label: 'Requested (Newest)', compare: (a, b) => compareDates(b.created_at, a.created_at) },
      { value: 'created_asc', label: 'Requested (Oldest)', compare: (a, b) => compareDates(a.created_at, b.created_at) },
      { value: 'student_asc', label: 'Student (A-Z)', compare: (a, b) => compareStrings(a.studentName, b.studentName) },
    ],
    []
  )
  const { sorted, sortKey, setSortKey } = useSort(filtered, sortOptions)
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(sorted, `${tab}|${search}|${sortKey}`)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'handled', label: 'Handled', count: counts.handled },
    { key: 'all', label: 'All', count: counts.all },
  ]
  const today = todayIso()

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'bg-[#0b1b62] text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_260px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student, parent, email, or reason"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400"
            />
          </div>
          <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              <tr>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Requested By</th>
                <th className="p-4 font-medium">Last Day</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((r) => {
                  const due = r.status === 'pending' && r.last_day <= today
                  return (
                    <tr key={r.id}>
                      <td className="p-4">
                        <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{r.studentName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{r.programName ?? 'No program'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-900 dark:text-gray-100">{r.parentName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{r.parentEmail ?? '-'}</p>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {formatDateShort(r.last_day)}
                        {due && (
                          <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            Due
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setOpenId(r.id)}
                          className={
                            r.status === 'pending'
                              ? 'rounded-full bg-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#08154d]'
                              : 'rounded-full border border-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-[#0b1b62] hover:bg-[#0b1b62] hover:text-white dark:border-indigo-300 dark:text-indigo-300'
                          }
                        >
                          {r.status === 'pending' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    {tab === 'pending' ? 'No pending unenrollment requests.' : 'No requests match.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {openRequest && <ReviewModal key={openRequest.id} request={openRequest} onClose={() => setOpenId(null)} />}
    </>
  )
}
