const NAME_CHARACTERS = /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/
const HAS_LETTER = /[a-zA-ZÀ-ÖØ-öø-ÿ]/
const MIN_NAME_LENGTH = 2

// The character-set check alone lets a name through that's made entirely of
// hyphens/apostrophes/spaces (e.g. "---") since those are legitimately part
// of real names (O'Brien, Smith-Jones) and the pattern never required an
// actual letter to also be present. Requiring HAS_LETTER too closes that gap
// without rejecting any real name. MIN_NAME_LENGTH closes a second gap found
// via retro pen-testing: a single-letter name (e.g. "A") passed both checks
// above but isn't a plausible real name.
export function isValidName(value: string) {
  const trimmed = value.trim()
  return trimmed.length >= MIN_NAME_LENGTH && NAME_CHARACTERS.test(trimmed) && HAS_LETTER.test(trimmed)
}

export const NAME_VALIDATION_MESSAGE = `Names must be at least ${MIN_NAME_LENGTH} characters, and may only contain letters, spaces, hyphens, and apostrophes.`
