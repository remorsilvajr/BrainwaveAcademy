// The one-line summary shown above a form that failed validation. When exactly one thing
// is wrong, say what it is (a password rule, for example) instead of a generic "fix the
// highlighted fields", which left people hunting a long form for the problem. With
// several, stay generic; each field still shows its own message.
export function formErrorBanner(fieldErrors: Record<string, string>): string {
  const messages = Object.values(fieldErrors)
  if (messages.length === 1) return messages[0]
  return 'Please fix the highlighted fields below.'
}
