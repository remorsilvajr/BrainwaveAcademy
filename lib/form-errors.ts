// The one-line summary shown above a form that failed validation. When exactly one thing
// is wrong, say what it is (a password rule, for example) instead of a generic "fix the
// highlighted fields", which left people hunting a long form for the problem. With
// several, stay generic; each field still shows its own message.
export function formErrorBanner(fieldErrors: Record<string, string>): string {
  const messages = Object.values(fieldErrors)
  if (messages.length === 1) return messages[0]
  return 'Please fix the highlighted fields below.'
}

// "A, B and C" for a list of field labels.
export function joinLabels(labels: string[]): string {
  return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

// Names only the fields that are actually blank: `[['First name', ''], ['Gender', 'female']]`
// gives "First name is required." (a fixed sentence listing every required field, shown
// when only one was blank, sent people checking fields that were fine). Null when none is.
export function missingFieldsMessage(fields: [label: string, value: unknown][]): string | null {
  const missing = fields.filter(([, value]) => !value).map(([label]) => label)
  if (missing.length === 0) return null
  return `${joinLabels(missing)} ${missing.length === 1 ? 'is' : 'are'} required.`
}
