'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User as UserIcon } from 'lucide-react'
import { calculateAge, formatDateLong } from '@/lib/format'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'

type Student = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  avatar_url: string | null
}

export function TeacherStudentsTable({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('')

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return `${s.first_name} ${s.middle_name ?? ''} ${s.last_name}`.toLowerCase().includes(term)
  })

  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, search)

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <label className="mb-1 block text-xs font-medium text-gray-500">Search Students</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Student name"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white">
        <div className="min-h-[420px] overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Date of Birth</th>
              <th className="p-4 font-medium">Gender</th>
              <th className="p-4 font-medium">Enrollment Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {s.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <UserIcon className="h-4 w-4" />
                      </span>
                    )}
                    <span className="font-medium text-gray-900">
                      {s.first_name}
                      {s.middle_name ? ` ${s.middle_name}` : ''} {s.last_name}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-gray-600">
                  {formatDateLong(s.date_of_birth)} ({calculateAge(s.date_of_birth)}y)
                </td>
                <td className="p-4 capitalize text-gray-600">{s.gender}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      s.enrollment_status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.enrollment_status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={`/teacher/student-dashboard?student=${s.id}`}
                    className="text-sm font-semibold text-[#00a3e0] hover:underline"
                  >
                    Show Student Record
                  </Link>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                  {students.length === 0 ? 'No students on file yet.' : 'No students match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </>
  )
}
