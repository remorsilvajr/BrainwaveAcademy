'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

export type DropdownOption = { value: string; label: string }

// A custom trigger+panel dropdown instead of a native <select> — besides the
// capped-height/portal-positioning reasons documented where this was first
// built (see DobSelect, which still keeps its own private copy inline since
// it composes three of these into one Day/Month/Year field), a native
// <select>'s hidden <option> text is still part of the DOM even while
// closed. Some browsers include that hidden text when a selection spanning
// the control is copied to the clipboard, e.g. selecting a form's visible
// text and getting every unselected option's label pasted back too — this
// component only ever renders the single selected label as real text, so
// there's nothing hidden to leak.
export function DropdownField({
  value,
  options,
  placeholder,
  ariaLabel,
  hasError,
  disabled,
  onChange,
}: {
  value: string
  options: DropdownOption[]
  placeholder: string
  ariaLabel: string
  hasError?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  function openDropdown() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return
    // Scrolling *inside* the panel's own option list must not close it —
    // only a scroll somewhere else (e.g. an ancestor Modal body) should,
    // since that's what would otherwise leave this `position: fixed` panel
    // visually detached from its trigger.
    function closeOnScroll(e: Event) {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      setIsOpen(false)
    }
    window.addEventListener('scroll', closeOnScroll, true)
    return () => window.removeEventListener('scroll', closeOnScroll, true)
  }, [isOpen])

  function selectOption(optionValue: string) {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false)
        }}
        className={`flex w-full items-center justify-between gap-1 rounded-lg border bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:outline-none disabled:opacity-60 ${
          selected ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
        } ${
          hasError
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-[#0b1b62] dark:focus:border-indigo-400'
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setIsOpen(false)} />
            <div
              ref={panelRef}
              role="listbox"
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[80] max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg"
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => selectOption(o.value)}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    o.value === value ? 'font-semibold text-[#0b1b62] dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
