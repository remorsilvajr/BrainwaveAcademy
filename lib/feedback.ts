// Single source of truth for feedback categories, mirroring lib/milestones.ts's
// category-labels-map pattern — the `feedback_category_check` constraint in
// the DB enforces the same fixed set of values, so a new category needs
// updating in both places.
export const feedbackCategoryLabels: Record<string, string> = {
  bug: 'Bug Report',
  concern: 'Concern',
  suggestion: 'Suggestion',
  compliment: 'Compliment',
  general: 'General Feedback',
  other: 'Other',
}

export const feedbackCategoryOrder = Object.keys(feedbackCategoryLabels)
