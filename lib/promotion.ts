import { isAgeEligibleForClassroom } from '@/lib/classrooms'

// The order children move through the age-graded programs at year-end; the last
// one graduates. Tutorial and Quiz Bee & Competitions aren't on it: they aren't
// a step in a child's progression, so they default to "stay" and are only
// graduated by hand in the review. Keyed by classroom `slug`.
export const PROMOTION_LADDER: readonly string[] = [
  'little-explorers',
  'advanced-toddler',
  'smart-explorers',
  'curious-adventurers',
]

export type LadderClassroom = {
  id: string
  name: string
  slug: string
  min_age_months: number | null
  max_age_months: number | null
}

// What the admin picks per student: keep them where they are, graduate them, or
// the id of a ladder classroom to move them into.
export type PromotionChoice = string

export const CHOICE_STAY = 'stay'
export const CHOICE_GRADUATE = 'graduate'

export function ladderClassrooms<T extends { slug: string }>(classrooms: T[]): T[] {
  return PROMOTION_LADDER.flatMap((slug) => classrooms.filter((c) => c.slug === slug))
}

export function suggestChoice(
  student: { date_of_birth: string; classroomSlug: string | null },
  ladder: LadderClassroom[]
): { choice: PromotionChoice; note: string | null } {
  const index = student.classroomSlug ? PROMOTION_LADDER.indexOf(student.classroomSlug) : -1
  if (index === -1) return { choice: CHOICE_STAY, note: null }
  if (index === PROMOTION_LADDER.length - 1) return { choice: CHOICE_GRADUATE, note: null }

  const next = ladder.find((c) => c.slug === PROMOTION_LADDER[index + 1])
  if (!next) return { choice: CHOICE_STAY, note: null }
  if (!isAgeEligibleForClassroom(student.date_of_birth, next)) {
    return { choice: CHOICE_STAY, note: `Not age-eligible for ${next.name}` }
  }
  return { choice: next.id, note: null }
}
