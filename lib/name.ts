const NAME_CHARACTERS = /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/
const HAS_LETTER = /[a-zA-ZÀ-ÖØ-öø-ÿ]/

// The character-set check alone lets a name through that's made entirely of
// hyphens/apostrophes/spaces (e.g. "---") since those are legitimately part
// of real names (O'Brien, Smith-Jones) and the pattern never required an
// actual letter to also be present. Requiring HAS_LETTER too closes that gap
// without rejecting any real name.
export function isValidName(value: string) {
  return NAME_CHARACTERS.test(value) && HAS_LETTER.test(value)
}

export const NAME_VALIDATION_MESSAGE =
  'Only letters, spaces, hyphens, and apostrophes are allowed, and at least one letter is required.'
