'use client'

import { useId, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Bottom-of-list pager shared by every list in the app (see
// lib/use-pagination.ts): Prev/Next, a compact run of clickable page
// numbers (with a "…" gap when there are too many to show), and a manual
// "Go to page" input for jumping straight to a page instead of clicking
// through every one in between.
export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const inputId = useId()
  const [goToValue, setGoToValue] = useState(String(page))
  // Keep the "Go to page" input in sync when `page` changes from outside
  // (Prev/Next, a page-number button, a search resetting to page 1) — done
  // inline during render (React's documented pattern for "adjusting state
  // when a prop changes") rather than a useEffect, so the input never shows
  // a stale value for even one frame.
  const [lastPage, setLastPage] = useState(page)
  if (page !== lastPage) {
    setLastPage(page)
    setGoToValue(String(page))
  }

  if (totalItems === 0 || totalPages <= 1) return null

  function commitGoTo() {
    const parsed = parseInt(goToValue, 10)
    if (Number.isFinite(parsed)) {
      onPageChange(Math.min(Math.max(parsed, 1), totalPages))
    } else {
      setGoToValue(String(page))
    }
  }

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const nums = Array.from(new Set([1, totalPages, page - 1, page, page + 1]))
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b)
    const result: (number | '…')[] = []
    for (let i = 0; i < nums.length; i++) {
      if (i > 0 && nums[i] - nums[i - 1] > 1) result.push('…')
      result.push(nums[i])
    }
    return result
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row">
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{startItem}–{endItem}</span> of{' '}
        <span className="font-medium text-gray-700">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNumbers().map((n, i) =>
          n === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                n === page ? 'bg-[#0b1b62] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <label htmlFor={inputId} className="whitespace-nowrap">
          Go to page
        </label>
        <input
          id={inputId}
          type="number"
          min={1}
          max={totalPages}
          value={goToValue}
          onChange={(e) => setGoToValue(e.target.value)}
          onBlur={commitGoTo}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitGoTo()
            }
          }}
          className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm focus:border-[#0b1b62] focus:outline-none"
        />
        <span className="whitespace-nowrap">of {totalPages}</span>
      </div>
    </div>
  )
}
