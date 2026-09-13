'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export type SearchableOption = { value: string; label: string; sublabel?: string }

// A local-state-driven searchable combobox — same button+panel+search-input
// shape as StudentSelector/ParentTopBar's child switcher, but selection just
// calls `onChange` rather than navigating via a `?student=` URL param. Meant
// for picking a teacher/student inside an admin modal (classroom teacher
// assignment, manual payment recording) where the list can realistically
// outgrow a plain <select>.
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  disabled = false,
}: {
  options: SearchableOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const filtered = options.filter((o) => {
    if (!query.trim()) return true
    const term = query.toLowerCase()
    return o.label.toLowerCase().includes(term) || (o.sublabel ?? '').toLowerCase().includes(term)
  })

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none disabled:opacity-60"
      >
        <span className={selected ? '' : 'text-slate-400 dark:text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && filtered[0]) {
                  onChange(filtered[0].value)
                  setOpen(false)
                  setQuery('')
                }
              }}
              placeholder="Search…"
              className="w-full bg-transparent text-sm outline-none placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No matches.</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  setQuery('')
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  o.value === value ? 'bg-sky-50 dark:bg-sky-950/30 font-medium' : ''
                }`}
              >
                {o.label}
                {o.sublabel && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{o.sublabel}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
