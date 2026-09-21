import { todayIso } from '@/lib/format'

// A Philippine school year runs about June to March, written "2026-2027". The
// year-end review closes one: a child's promotion is recorded against the year
// just completed.
const SCHOOL_YEAR = /^(\d{4})-(\d{4})$/

export function isValidSchoolYear(value: string): boolean {
  const match = SCHOOL_YEAR.exec(value)
  if (!match) return false
  const start = Number(match[1])
  return start >= 2000 && start <= 2100 && Number(match[2]) === start + 1
}

// The school year that is current at `today` (Manila): a new one starts in July,
// so June still belongs to the year that is ending, which is when the review
// normally happens.
export function currentSchoolYear(today: string = todayIso()): string {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

// The last, current and next school years, for the review's year picker.
export function schoolYearOptions(today: string = todayIso()): string[] {
  const start = Number(currentSchoolYear(today).slice(0, 4))
  return [start - 1, start, start + 1].map((y) => `${y}-${y + 1}`)
}
