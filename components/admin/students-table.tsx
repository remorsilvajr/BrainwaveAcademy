'use client'

import { useMemo, useState } from 'react'
import { StudentRecordSlideover } from '@/components/admin/student-record-slideover'

type Guardian = { name: string; relationship: string | null; phone: string | null; email: string | null }
type DocRow = { document_type: string; file_url: string; verification_status: string }

type Student = {
  id: string
  student_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  guardians: Guardian[]
  documents: DocRow[]
}

export function StudentsTable({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Student | null>(null)

  const statuses = useMemo(
    () => Array.from(new Set(students.map((s) => s.enrollment_status))),
    [students]
  )

  const filtered = students.filter((s) => {
    if (statusFilter !== 'all' && s.enrollment_status !== statusFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const guardianMatch = s.guardians.some((g) => g.name.toLowerCase().includes(term))
    return (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
      (s.student_id ?? '').toLowerCase().includes(term) ||
      guardianMatch
    )
  })

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Search Students</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student Name, ID, or Parent Name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
            >
              <option value="all">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Guardian Contact</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((s) => {
                const guardian = s.guardians[0]
                return (
                  <tr key={s.id}>
                    <td className="p-4">
                      <p className="font-medium text-[#0b1b62]">
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{s.student_id ?? '—'}</p>
                    </td>
                    <td className="p-4 text-gray-700">
                      {guardian ? (
                        <>
                          <p>{guardian.name}</p>
                          <p className="text-xs text-gray-500">{guardian.phone}</p>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-block rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium capitalize text-green-700">
                        {s.enrollment_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelected(s)}
                        className="rounded-full border border-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-[#0b1b62] hover:bg-[#0b1b62] hover:text-white"
                      >
                        Open Full Record
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  No students match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <StudentRecordSlideover student={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
