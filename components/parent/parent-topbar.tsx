'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, User as UserIcon } from 'lucide-react'
import type { NavSection } from '@/components/sidebar'

type Student = { id: string; first_name: string; last_name: string }
type Parent = { first_name: string; last_name: string; avatar_url: string | null }

export function ParentTopBar({
  sections,
  students,
  parent,
}: {
  sections: NavSection[]
  students: Student[]
  parent: Parent
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [studentMenuOpen, setStudentMenuOpen] = useState(false)

  const title =
    pathname === '/parent'
      ? 'Brainwave Dashboard'
      : (sections.flatMap((s) => s.items).find((item) => item.href === pathname)?.label ?? 'Brainwave Dashboard')

  const selectedId = searchParams.get('student') ?? students[0]?.id ?? null
  const selected = students.find((s) => s.id === selectedId) ?? null

  function selectStudent(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('student', id)
    router.push(`${pathname}?${params.toString()}`)
    setStudentMenuOpen(false)
  }

  return (
    <header className="sticky top-14 z-20 border-b border-gray-200 bg-white px-4 py-4 sm:px-8 lg:top-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-lg font-bold text-[#0b1b62] sm:text-xl">{title}</h1>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {students.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setStudentMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
              >
                <span aria-hidden="true">🎒</span>
                <span className="hidden sm:inline">Child: </span>
                {selected ? `${selected.first_name} ${selected.last_name}` : 'Select'}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {studentMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStudentMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectStudent(s.id)}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                          s.id === selectedId ? 'font-semibold text-[#0b1b62]' : 'text-gray-700'
                        }`}
                      >
                        {s.first_name} {s.last_name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-2.5">
            {parent.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parent.avatar_url}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <UserIcon className="h-5 w-5" />
              </span>
            )}
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900">
                {parent.last_name}, {parent.first_name.charAt(0)}.
              </p>
              <p className="hidden text-xs text-gray-500 sm:block">Parent / Guardian</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
