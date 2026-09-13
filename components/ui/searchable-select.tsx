'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

export type SearchableOption = { value: string; label: string; sublabel?: string }

// A local-state-driven searchable combobox — same button+panel+search-input
// shape as StudentSelector/ParentTopBar's child switcher, but selection just
// calls `onChange` rather than navigating via a `?student=` URL param. Meant
// for picking a teacher/student inside an admin modal (classroom teacher
// assignment, manual payment recording) where the list can realistically
// outgrow a plain <select>.
//
// The panel renders through a portal into `document.body`, positioned
// `fixed` from the trigger's own `getBoundingClientRect()` — exactly the
// same fix `DobSelect` already needed for the identical reason: every real
// call site here sits inside a `Modal` whose body is `overflow-y-auto`, and
// a plain `absolute`-positioned panel gets silently clipped by that
// ancestor's overflow the moment it extends past the scrollable region's
// edge (found live, in this exact component, inside the Classrooms teacher
// assignment modal). See DobSelect's own note in this file's sibling for the
// fuller explanation of why a portal is required here, not optional polish.
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
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  function openDropdown() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    // Same reasoning as DobSelect: a scroll inside the panel's own option
    // list must not close it, only a scroll elsewhere (e.g. the Modal body
    // this is anchored to) should, since that's what would otherwise leave
    // this `position: fixed` panel visually detached from its trigger.
    function closeOnScroll(e: Event) {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', closeOnScroll, true)
    return () => window.removeEventListener('scroll', closeOnScroll, true)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const filtered = options.filter((o) => {
    if (!query.trim()) return true
    const term = query.toLowerCase()
    return o.label.toLowerCase().includes(term) || (o.sublabel ?? '').toLowerCase().includes(term)
  })

  function selectOption(optionValue: string) {
    onChange(optionValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none disabled:opacity-60"
      >
        <span className={selected ? '' : 'text-slate-400 dark:text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[80] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false)
                    if (e.key === 'Enter' && filtered[0]) selectOption(filtered[0].value)
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
                    onClick={() => selectOption(o.value)}
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
          </>,
          document.body
        )}
    </div>
  )
}
