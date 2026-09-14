import { useState } from 'react'

export type SortOption<T> = { value: string; label: string; compare: (a: T, b: T) => number }

// Shared by every admin list-shaped table alongside usePagination — same
// "one hook, reused everywhere" reasoning CLAUDE.md documents for
// pagination. Takes the already-filtered array, returns it sorted by
// whichever option is currently selected. Sorts a shallow copy (`.sort` is
// in-place) so the caller's own array/query result is never mutated.
export function useSort<T>(items: T[], options: SortOption<T>[]) {
  const [sortKey, setSortKey] = useState(options[0]?.value ?? '')
  const active = options.find((o) => o.value === sortKey) ?? options[0]
  const sorted = active ? [...items].sort(active.compare) : items
  return { sorted, sortKey, setSortKey, options }
}

// Common comparators so each table doesn't hand-roll the same
// locale-aware string compare / date compare / number compare.
export const compareStrings = (a: string, b: string) => a.localeCompare(b)
export const compareDates = (a: string | null, b: string | null) => {
  const aTime = a ? new Date(a).getTime() : 0
  const bTime = b ? new Date(b).getTime() : 0
  return aTime - bTime
}
