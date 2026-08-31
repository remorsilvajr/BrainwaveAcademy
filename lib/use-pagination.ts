'use client'

import { useState } from 'react'

const DEFAULT_PAGE_SIZE = 10

// Shared by every paginated list in the app (User Management, Students,
// Applications, Activity Log, Announcements, Attendance roster, etc.) so
// "10 per page, jump back to page 1 when the search/filter changes" behaves
// identically everywhere instead of each list re-deriving its own
// page-clamping logic.
//
// `resetKey` should combine every search/filter input that changes what
// `items` contains (e.g. `${search}|${roleFilter}|${statusFilter}`) — the
// reset happens inline during render (React's documented pattern for
// "adjusting state when a prop changes"), not in a useEffect, so the same
// render that applies a new filter already shows page 1 of the new
// results instead of flashing the old page first.
export function usePagination<T>(items: T[], resetKey: string, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [lastResetKey, setLastResetKey] = useState(resetKey)

  let currentPage = page
  if (resetKey !== lastResetKey) {
    currentPage = 1
    setLastResetKey(resetKey)
    setPage(1)
  }

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)

  const start = (safePage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return { page: safePage, setPage, totalPages, totalItems, pageItems, pageSize }
}
