'use client'

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, Search } from 'lucide-react'

type Student = { id: string; first_name: string; last_name: string; classroom_id?: string | null }
type Classroom = { id: string; name: string }

// Switching student only changes ?student= on the same page, so the route's
// loading skeleton never shows and the old student would sit there for the
// second or two the server takes. The switch runs in a transition shared
// through this context: the picker shows the new name with a spinner at once,
// and StudentSwitchArea dims the old content until the new one lands.
const SwitchContext = createContext<{ isPending: boolean; startTransition: (fn: () => void) => void } | null>(null)

export function StudentSwitchProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition()
  return <SwitchContext.Provider value={{ isPending, startTransition }}>{children}</SwitchContext.Provider>
}

export function StudentSwitchArea({ children }: { children: ReactNode }) {
  const ctx = useContext(SwitchContext)
  const pending = ctx?.isPending ?? false
  return (
    <div aria-busy={pending} className={`transition-opacity ${pending ? 'pointer-events-none opacity-50' : ''}`}>
      {children}
    </div>
  )
}

const selectClasses =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-indigo-400'

// A plain <select> listing every student system-wide doesn't scale — a
// school with a couple hundred enrolled students turns "pick one" into a
// long, unsearchable native scrollbox. This is a searchable combobox
// instead: the trigger shows the current selection, and the open panel
// filters the list as you type. With classrooms given, a Class select narrows
// the list (kept in ?class=) and jumps to that class's first student.
export function StudentSelector({
  students,
  classrooms = [],
  selectedId,
  selectedClassId = '',
  basePath = '/teacher/student-dashboard',
}: {
  students: Student[]
  // Optional — omit for a caller that hasn't fetched classrooms, and each
  // option just shows the student's name with no classroom sublabel.
  classrooms?: Classroom[]
  selectedId: string
  selectedClassId?: string
  basePath?: string
}) {
  const router = useRouter()
  const ctx = useContext(SwitchContext)
  const [localPending, localStart] = useTransition()
  const isPending = ctx?.isPending ?? localPending
  const startTransition = ctx?.startTransition ?? localStart
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [classId, setClassId] = useState(selectedClassId)
  const inputRef = useRef<HTMLInputElement>(null)
  const classroomById = new Map(classrooms.map((c) => [c.id, c.name]))

  const inClass = classId ? students.filter((s) => s.classroom_id === classId) : students
  const shownId = isPending && pendingId ? pendingId : selectedId
  const selected = students.find((s) => s.id === shownId) ?? null

  const filtered = inClass.filter((s) => {
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

  function go(studentId: string | null, nextClassId: string) {
    const params = new URLSearchParams()
    if (studentId) params.set('student', studentId)
    if (nextClassId) params.set('class', nextClassId)
    setPendingId(studentId)
    startTransition(() => {
      router.push(`${basePath}${params.size > 0 ? `?${params}` : ''}`)
    })
  }

  function selectStudent(id: string) {
    setIsOpen(false)
    if (id !== selectedId) go(id, classId)
  }

  function selectClass(nextClassId: string) {
    setClassId(nextClassId)
    // Stay on the current student if they are in the chosen class; otherwise show the class's first student.
    const current = students.find((s) => s.id === selectedId)
    if (!nextClassId || current?.classroom_id === nextClassId) {
      go(selectedId, nextClassId)
      return
    }
    const first = students.find((s) => s.classroom_id === nextClassId)
    go(first?.id ?? null, nextClassId)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {classrooms.length > 0 && (
        <>
          <label htmlFor="student-class-filter" className="sr-only">
            Class
          </label>
          <select id="student-class-filter" value={classId} onChange={(e) => selectClass(e.target.value)} className={selectClasses}>
            <option value="">All classes</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </>
      )}
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
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" aria-label="Loading" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          )}
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
                  className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
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
                      {classrooms.length > 0 && !classId && (
                        <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">
                          {s.classroom_id ? (classroomById.get(s.classroom_id) ?? '') : 'Unassigned'}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                    {classId ? 'No students in this class.' : 'No students found.'}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
