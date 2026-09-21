// Single source of truth for feedback categories, mirroring lib/milestones.ts's
// category-labels-map pattern — the `feedback_category_check` constraint in
// the DB enforces the same fixed set of values, so a new category needs
// updating in both places. Key order is the dropdown order (Bug Report sits
// between General Feedback and Other).
export const feedbackCategoryLabels: Record<string, string> = {
  concern: 'Concern',
  suggestion: 'Suggestion',
  compliment: 'Compliment',
  general: 'General Feedback',
  bug: 'Bug Report',
  other: 'Other',
}

export const feedbackCategoryOrder = Object.keys(feedbackCategoryLabels)

// What the form opens on (unchanged from before the dropdown was reordered).
export const DEFAULT_FEEDBACK_CATEGORY = 'bug'

// What the form suggests for each category: the intro line, the subject
// placeholder, and the label and placeholder of the main text box. Only
// wording, so switching category never clears what was already typed.
export type FeedbackPrompts = {
  intro: string
  subjectPlaceholder: string
  messageLabel: string
  messagePlaceholder: string
}

export const feedbackPrompts: Record<string, FeedbackPrompts> = {
  general: {
    intro: 'Anything you would like the school to know? Share it here and the admin team will read it.',
    subjectPlaceholder: 'e.g. A question about how the portal works',
    messageLabel: 'Your feedback',
    messagePlaceholder: 'Tell us what is on your mind.',
  },
  bug: {
    intro:
      'Ran into something broken or confusing? Let us know what happened and where. The more specific, the faster we can fix it.',
    subjectPlaceholder: "e.g. Can't upload a document on the Requirements page",
    messageLabel: 'What happened?',
    messagePlaceholder: 'What were you trying to do, what happened instead, and on which page?',
  },
  concern: {
    intro: 'Something worrying you, or something that was not handled well? Tell us and the admin team will follow up.',
    subjectPlaceholder: 'e.g. A charge I do not recognize on the account',
    messageLabel: 'What is your concern?',
    messagePlaceholder: 'Describe the situation, who or what it involves, and when it happened.',
  },
  suggestion: {
    intro: 'Have an idea that would make the school or this portal better? We would like to hear it.',
    subjectPlaceholder: 'e.g. Send a reminder before school events',
    messageLabel: 'Your suggestion',
    messagePlaceholder: 'What would you like to see, and how would it help?',
  },
  compliment: {
    intro: 'Did something go especially well? Let us know so we can pass it on.',
    subjectPlaceholder: 'e.g. Thank you for the field trip',
    messageLabel: 'What went well?',
    messagePlaceholder: 'Tell us who or what made a difference.',
  },
  other: {
    intro: 'Something that does not fit the other categories? Send it here and the admin team will follow up.',
    subjectPlaceholder: 'e.g. A question about enrollment',
    messageLabel: 'Your message',
    messagePlaceholder: 'Share the details here.',
  },
}
