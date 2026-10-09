// The order children move through the age-graded programs (lib/auto-promotion.ts);
// finishing the last one completes preschool (lib/completion.ts). Tutorial and Quiz
// Bee & Competitions aren't a step in a child's progression, so they aren't on it.
// Keyed by classroom `slug`.
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

export function ladderClassrooms<T extends { slug: string }>(classrooms: T[]): T[] {
  return PROMOTION_LADDER.flatMap((slug) => classrooms.filter((c) => c.slug === slug))
}
