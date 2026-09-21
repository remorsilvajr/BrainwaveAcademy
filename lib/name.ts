const LETTER = 'a-zA-ZÀ-ÖØ-öø-ÿ'
const MIN_NAME_LENGTH = 2

// A name is one or more words separated by a SINGLE space; each word is letters, with
// an optional hyphen or apostrophe only BETWEEN letters (O'Brien, Mary-Jane, D'Angelo-Cruz,
// De la Cruz). So these are all rejected: "Ana  Maria" (double space), "a'" and "'a" (an
// apostrophe at an end), "a--b" and "a-'b" (two marks in a row), "---", "Ana 2". The
// earlier check only tested which characters were present, so any mix of spaces, hyphens
// and apostrophes with one letter somewhere passed. MIN_NAME_LENGTH still rejects a single
// letter ("A"), found via retro pen-testing.
const WORD = `[${LETTER}]+(?:['-][${LETTER}]+)*`
const NAME_SHAPE = new RegExp(`^${WORD}(?: ${WORD})*$`)

export function isValidName(value: string) {
  const trimmed = value.trim()
  return trimmed.length >= MIN_NAME_LENGTH && NAME_SHAPE.test(trimmed)
}

export const NAME_VALIDATION_MESSAGE = `Names must be at least ${MIN_NAME_LENGTH} characters and use letters only, with single spaces and any hyphen or apostrophe between letters (like O'Brien or Mary-Jane).`

// The same rule for an <input pattern>: browsers anchor it themselves and compile it in
// unicode-sets mode, so the alternation is spelled out rather than using a class with a
// bare hyphen. UX only; isValidName is the real check.
export const NAME_HTML_PATTERN = `[${LETTER}]+(?:(?:'|-)[${LETTER}]+)*(?: [${LETTER}]+(?:(?:'|-)[${LETTER}]+)*)*`
export const NAME_HTML_TITLE = "Letters only, with single spaces and any hyphen or apostrophe between letters (like O'Brien or Mary-Jane)."

// Capitalizes the first letter of each word/hyphen/apostrophe-separated
// segment (e.g. "mary-jane o'brien" -> "Mary-Jane O'Brien"). Only `/enroll`
// and `/parent/enroll-a-student` applied this (each with its own private
// copy of this exact function) — every admin-side name mutation
// (Create New Account, Students, User Management, Teachers) saved names
// exactly as typed, so an admin typing a lowercase name saved it lowercase.
// Centralized here alongside isValidName for the same reason that function
// was centralized: so a new name-accepting form gets both by importing one
// module instead of risking only picking up one of the two.
export function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])([a-zà-öø-ÿ])/g, (_match, sep, char) => sep + char.toUpperCase())
}
