'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { restoreFee } from '@/app/admin/payments/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { formatCurrency, formatDateLong } from '@/lib/format'

export type DeletedFeeRow = {
  id: string
  studentName: string
  studentAccountId: string | null
  label: string
  amount: number
  status: string
  dueDate: string | null
  reason: string
  deletedAt: string
  deletedByName: string
}

// Fees a super admin deleted (Payments > a fee > Delete Fee). Each keeps
// everything it had, and Restore puts it back exactly as it was.
export function DeletedFeesTable({ fees }: { fees: DeletedFeeRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [restoring, setRestoring] = useState<DeletedFeeRow | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  const term = search.trim().toLowerCase()
  const filtered = fees.filter((f) => !term || `${f.studentName} ${f.studentAccountId ?? ''} ${f.label} ${f.reason}`.toLowerCase().includes(term))
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)

  async function handleRestore() {
    if (!restoring) return
    setIsWorking(true)
    setError('')
    try {
      const result = await restoreFee(restoring.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setRestoring(null)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-100 p-4 dark:border-gray-800">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student, fee or reason"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100"
        />
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      </div>
      <div className="min-h-[360px] overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
            <tr>
              {['Student', 'Fee', 'Amount', 'Deleted', 'Reason', 'Action'].map((h) => (
                <th key={h} className="p-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pageItems.length > 0 ? (
              pageItems.map((f) => (
                <tr key={f.id}>
                  <td className="p-4">
                    <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{f.studentName}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{f.studentAccountId ?? '-'}</p>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    <p>{f.label}</p>
                    <p className="text-xs capitalize text-gray-400 dark:text-gray-500">
                      Was {f.status === 'pending' ? 'unpaid' : f.status}
                      {f.dueDate ? `, due ${formatDateLong(f.dueDate)}` : ''}
                    </p>
                  </td>
                  <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(f.amount)}</td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    <p>{formatDateLong(f.deletedAt)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">by {f.deletedByName}</p>
                  </td>
                  <td className="max-w-xs whitespace-pre-wrap p-4 text-gray-600 dark:text-gray-400">{f.reason}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => setRestoring(f)}
                      className="rounded-full border border-[#0b1b62] px-3 py-1.5 text-xs font-semibold text-[#0b1b62] hover:bg-[#0b1b62] hover:text-white dark:border-indigo-300 dark:text-indigo-300"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500">
                  {fees.length === 0 ? 'No deleted fees.' : 'No deleted fees match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      {restoring && (
        <ConfirmDialog
          title="Restore this fee?"
          description={`${restoring.label} (${formatCurrency(restoring.amount)}) goes back on ${restoring.studentName}'s account exactly as it was.`}
          confirmLabel="Yes, Restore"
          tone="neutral"
          isPending={isWorking}
          onConfirm={handleRestore}
          onCancel={() => setRestoring(null)}
        />
      )}
    </div>
  )
}
