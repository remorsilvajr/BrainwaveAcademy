'use client'

import { useMemo, useState } from 'react'
import { formatCurrency } from '@/lib/format'
import { AdjustWalletModal } from '@/components/admin/adjust-wallet-modal'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { SortSelect } from '@/components/ui/sort-select'
import { useSort, compareStrings, type SortOption } from '@/lib/use-sort'

export type ParentWallet = { id: string; name: string; email: string; balance: number; outstanding: number }

export function ParentWalletsTable({ parents }: { parents: ParentWallet[] }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ParentWallet | null>(null)

  const filtered = parents.filter((p) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term)
  })

  const sortOptions: SortOption<ParentWallet>[] = useMemo(
    () => [
      { value: 'name_asc', label: 'Name (A-Z)', compare: (a, b) => compareStrings(a.name, b.name) },
      { value: 'name_desc', label: 'Name (Z-A)', compare: (a, b) => compareStrings(b.name, a.name) },
      { value: 'balance_desc', label: 'Balance (High-Low)', compare: (a, b) => b.balance - a.balance },
      { value: 'balance_asc', label: 'Balance (Low-High)', compare: (a, b) => a.balance - b.balance },
      { value: 'outstanding_desc', label: 'Outstanding (High-Low)', compare: (a, b) => b.outstanding - a.outstanding },
    ],
    []
  )
  const { sorted, sortKey, setSortKey } = useSort(filtered, sortOptions)

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(sorted, `${search}|${sortKey}`)

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#0b1b62] dark:text-indigo-300">Parent Wallets</h2>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_260px]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parents by name or email"
          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
        />
        <SortSelect value={sortKey} onChange={setSortKey} options={sortOptions} label="Sort By" />
      </div>
      <div className="mt-3 min-h-[360px] space-y-2">
        {pageItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No parents match your search.</p>
        ) : (
          pageItems.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.balance)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Wallet</p>
                </div>
                <div className="min-w-[5.5rem] text-right">
                  <p
                    className={`font-semibold ${
                      p.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {formatCurrency(p.outstanding)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                </div>
                <button
                  onClick={() => setSelected(p)}
                  className="rounded-full border border-[#0b1b62] dark:border-indigo-300 px-3 py-1.5 text-xs font-semibold text-[#0b1b62] dark:text-indigo-300 hover:bg-[#0b1b62] hover:text-white"
                >
                  Adjust
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="-mx-4 -mb-4 mt-2">
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {selected && (
        <AdjustWalletModal
          parentId={selected.id}
          parentName={selected.name}
          currentBalance={selected.balance}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
