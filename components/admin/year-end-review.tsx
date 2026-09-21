'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, GraduationCap, Loader2 } from 'lucide-react'
import { applyYearEnd } from '@/app/admin/year-end/actions'
import type { YearEndResult } from '@/lib/year-end'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/lib/use-pagination'
import { calculateAge, formatCurrency } from '@/lib/format'
import { isAgeEligibleForClassroom } from '@/lib/classrooms'
import { CHOICE_GRADUATE, CHOICE_STAY, suggestChoice, type LadderClassroom } from '@/lib/promotion'

export type YearEndStudent = {
  id: string
  name: string
  studentAccountId: string | null
  date_of_birth: string
  classroomId: string | null
  classroomName: string | null
  classroomSlug: string | null
  outstanding: number
}

const ALL = 'all'

export function YearEndReview({
  schoolYear,
  yearOptions,
  students,
  ladder,
  ladderNames,
  processed,
}: {
  schoolYear: string
  yearOptions: string[]
  students: YearEndStudent[]
  ladder: LadderClassroom[]
  ladderNames: string[]
  processed: Record<'promoted' | 'stayed' | 'graduated', number>
}) {
  const router = useRouter()

  // The suggestion for each student, computed once; `choices` holds any edits.
  const suggestions = useMemo(
    () => new Map(students.map((s) => [s.id, suggestChoice({ date_of_birth: s.date_of_birth, classroomSlug: s.classroomSlug }, ladder)])),
    [students, ladder]
  )
  const [edits, setEdits] = useState<Record<string, string>>({})
  const choiceFor = (id: string) => edits[id] ?? suggestions.get(id)!.choice

  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState(ALL)
  const [confirming, setConfirming] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<YearEndResult | null>(null)

  const filtered = students.filter((s) => {
    if (programFilter === 'none' && s.classroomId) return false
    if (programFilter !== ALL && programFilter !== 'none' && s.classroomId !== programFilter) return false
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return s.name.toLowerCase().includes(term) || (s.studentAccountId ?? '').toLowerCase().includes(term)
  })
  const { page, setPage, totalPages, totalItems, pageItems, pageSize } = usePagination(filtered, `${search}|${programFilter}`)

  // Totals cover everyone still to be decided, not just the visible page.
  const totals = { promote: 0, stay: 0, graduate: 0, graduateOwing: 0, graduateOwedAmount: 0 }
  for (const s of students) {
    const c = choiceFor(s.id)
    if (c === CHOICE_STAY) totals.stay += 1
    else if (c === CHOICE_GRADUATE) {
      totals.graduate += 1
      if (s.outstanding > 0) {
        totals.graduateOwing += 1
        totals.graduateOwedAmount += s.outstanding
      }
    } else totals.promote += 1
  }

  async function handleApply() {
    setIsApplying(true)
    setError('')
    try {
      const response = await applyYearEnd(
        schoolYear,
        students.map((s) => ({ studentId: s.id, choice: choiceFor(s.id) }))
      )
      if ('error' in response) {
        setError(response.error)
        setConfirming(false)
        return
      }
      setResult(response)
      setConfirming(false)
      setEdits({})
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setConfirming(false)
    } finally {
      setIsApplying(false)
    }
  }

  const alreadyProcessed = processed.promoted + processed.stayed + processed.graduated

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
          <div>
            <label htmlFor="school-year" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              School year being closed
            </label>
            <select
              id="school-year"
              value={schoolYear}
              onChange={(e) => router.push(`/admin/year-end?year=${e.target.value}`)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400"
            >
              {(yearOptions.includes(schoolYear) ? yearOptions : [schoolYear, ...yearOptions]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {ladderNames.map((name, i) => (
              <span key={name} className="flex items-center gap-2">
                <span className="rounded-full bg-[#0b1b62]/5 px-3 py-1 font-medium text-[#0b1b62] dark:bg-indigo-400/10 dark:text-indigo-200">{name}</span>
                {i < ladderNames.length - 1 && <ArrowRight className="h-4 w-4 text-gray-400" />}
              </span>
            ))}
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="flex items-center gap-1 rounded-full bg-[#e6007e]/10 px-3 py-1 font-medium text-[#e6007e]">
              <GraduationCap className="h-4 w-4" /> Graduate
            </span>
          </div>
        </div>
        {alreadyProcessed > 0 && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Already done for {schoolYear}: {processed.promoted} promoted, {processed.stayed} stayed, {processed.graduated} graduated.
            They aren&apos;t listed below.
          </p>
        )}
      </div>

      {result && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-800 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Year-end applied: {result.promoted} promoted, {result.stayed} stayed, {result.graduated} graduated
            {result.skipped > 0 ? `, ${result.skipped} already done` : ''}.
          </p>
          {result.failed.length > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <p className="font-semibold">{result.failed.length} could not be applied and are still listed below:</p>
              <ul className="mt-1 list-disc pl-5">
                {result.failed.map((f) => (
                  <li key={f.name + f.error}>
                    {f.name}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {(
          [
            ['Promote', totals.promote, 'text-[#0b1b62] dark:text-indigo-300'],
            ['Stay', totals.stay, 'text-gray-700 dark:text-gray-300'],
            ['Graduate', totals.graduate, 'text-[#e6007e]'],
          ] as const
        ).map(([label, count, color]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className={`text-3xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_260px]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student name or ID"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Current program</label>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400"
            >
              <option value={ALL}>All programs</option>
              {[...new Map(students.filter((s) => s.classroomId).map((s) => [s.classroomId!, s.classroomName])).entries()].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
              <option value="none">No program</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="min-h-[420px] overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              <tr>
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Current Program</th>
                <th className="p-4 font-medium">Decision</th>
                <th className="p-4 font-medium">Unpaid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pageItems.length > 0 ? (
                pageItems.map((s) => {
                  const choice = choiceFor(s.id)
                  const note = suggestions.get(s.id)!.note
                  return (
                    <tr key={s.id}>
                      <td className="p-4">
                        <p className="font-medium text-[#0b1b62] dark:text-indigo-300">{s.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {s.studentAccountId ?? '-'} · {calculateAge(s.date_of_birth)}y
                        </p>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {s.classroomName ?? <span className="text-gray-400 dark:text-gray-500">No program</span>}
                      </td>
                      <td className="p-4">
                        <select
                          value={choice}
                          onChange={(e) => setEdits((current) => ({ ...current, [s.id]: e.target.value }))}
                          aria-label={`Decision for ${s.name}`}
                          className="w-full max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400"
                        >
                          <option value={CHOICE_STAY}>Stay{s.classroomName ? ` in ${s.classroomName}` : ''}</option>
                          {ladder
                            .filter((c) => c.id !== s.classroomId)
                            .map((c) => (
                              <option key={c.id} value={c.id} disabled={!isAgeEligibleForClassroom(s.date_of_birth, c)}>
                                Move to {c.name}
                                {!isAgeEligibleForClassroom(s.date_of_birth, c) ? ' (age not eligible)' : ''}
                              </option>
                            ))}
                          <option value={CHOICE_GRADUATE}>Graduate</option>
                        </select>
                        {note && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{note}</p>}
                      </td>
                      <td className="p-4">
                        {s.outstanding > 0 ? (
                          <span className={choice === CHOICE_GRADUATE ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}>
                            {formatCurrency(s.outstanding)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    {students.length === 0
                      ? `Every active student has been handled for ${schoolYear}.`
                      : 'No students match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {students.length} student{students.length === 1 ? '' : 's'} to decide for {schoolYear}. Changes on other pages and
          filters are kept until you apply.
        </p>
        <button
          onClick={() => setConfirming(true)}
          disabled={students.length === 0 || isApplying}
          className="flex items-center gap-2 rounded-lg bg-[#0b1b62] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplying && <Loader2 className="h-4 w-4 animate-spin" />}
          Apply to {students.length} student{students.length === 1 ? '' : 's'}
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Apply the ${schoolYear} year-end?`}
          description={`${totals.promote} will be promoted, ${totals.stay} will stay, and ${totals.graduate} will graduate.${
            totals.graduateOwing > 0
              ? ` ${totals.graduateOwing} of the graduating students still owe ${formatCurrency(totals.graduateOwedAmount)} in total; those fees stay collectible.`
              : ''
          } Promoted students get the new program's fees.`}
          confirmLabel="Yes, Apply"
          tone="danger"
          isPending={isApplying}
          onConfirm={handleApply}
          onCancel={() => setConfirming(false)}
        />
      )}
      {totals.graduateOwing > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {totals.graduateOwing} graduating student{totals.graduateOwing === 1 ? ' has' : 's have'} unpaid fees
          ({formatCurrency(totals.graduateOwedAmount)}).
        </p>
      )}
    </>
  )
}
