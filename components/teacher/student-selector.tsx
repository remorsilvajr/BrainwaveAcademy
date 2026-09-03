'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Search } from 'lucide-react'

type Student = { id: string; first_name: string; last_name: string }

// A plain <select> listing every student system-wide doesn't scale — a
// school with a couple hundred enrolled students turns "pick one" into a
// long, unsearchable native scrollbox. This is a searchable combobox
// instead: the trigger shows the current selection, and the open panel
// filters the list as you type.
export function StudentSelector({
  students,
  selectedId,
  basePath = '/teacher/student-dashboard',
}: {
  students: Student[]
  selectedId: string
  basePath?: string
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = students.find((s) => s.id === selectedId) ?? null

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(term)
  })

  // Autofocus the search input the moment the panel opens, so typing works
  // immediately without an extra click.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  function open() {
    setSearch('')
    setIsOpen(true)
  }

  function selectStudent(id: string) {
    router.push(`${basePath}?student=${id}`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <label className="sr-only" id="student-selector-label">
        Student
      </label>
      <button
        type="button"
        aria-labelledby="student-selector-label"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:border-[#0b1b62] dark:focus:border-indigo-400 focus:outline-none"
      >
        <span className="text-gray-500 dark:text-gray-400">Student:</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {selected ? `${selected.first_name} ${selected.last_name}` : 'Select a student'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg sm:left-auto sm:right-0">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false)
                  if (e.key === 'Enter' && filtered.length > 0) selectStudent(filtered[0].id)
                }}
                placeholder="Search students…"
                className="w-full text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectStudent(s.id)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      s.id === selectedId ? 'font-semibold text-[#0b1b62] dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {s.first_name} {s.last_name}
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-sm text-gray-400 dark:text-gray-500">No students found.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
