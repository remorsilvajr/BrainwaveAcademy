'use client'

import { useRouter } from 'next/navigation'

type Student = { id: string; first_name: string; last_name: string }

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

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="student" className="text-sm font-medium text-gray-600">
        Student:
      </label>
      <select
        id="student"
        value={selectedId}
        onChange={(e) => router.push(`${basePath}?student=${e.target.value}`)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#0b1b62] focus:outline-none"
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.first_name} {s.last_name}
          </option>
        ))}
      </select>
    </div>
  )
}
