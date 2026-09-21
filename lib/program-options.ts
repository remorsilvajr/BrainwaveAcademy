import type { SupabaseClient } from '@supabase/supabase-js'

// The two support programs run differently from the age-graded ones: they're
// billed by the hour (shown only, no fixed fee is generated) and a student
// signs up for one or more named options inside the program (a subject, or a
// competition). They're held at a separate branch, in one shared classroom
// with a section per option, so an option is a section of the one classroom,
// not a separate classroom.
//
// Keyed by the seeded classroom `slug` (not the display name, so renaming a
// program can't detach its options). To change a rate or an option, edit this
// file; a chosen option is stored by name on applications.requested_program_options
// and students.program_options, so renaming or removing an option also needs a
// data update for anyone who already picked it.
export type ProgramOptionConfig = {
  hourlyRate: number
  // Heading above the checkboxes ("Choose the subjects").
  optionsLabel: string
  options: readonly string[]
}

export const PROGRAM_OPTION_CONFIG: Record<string, ProgramOptionConfig> = {
  'academic-tutorials': {
    hourlyRate: 150,
    optionsLabel: 'subjects',
    options: ['Math', 'English', 'Science', 'Filipino'],
  },
  'quiz-bee-exam-prep': {
    hourlyRate: 200,
    optionsLabel: 'competitions',
    options: [
      'Math Quiz Bee',
      'Science Quiz Bee',
      'Spelling Competition',
      'Chess Competition',
      'DaMath Competition',
      'Journalism Competition',
    ],
  },
}

export const PROGRAM_BRANCH_NOTE =
  'Held at a separate branch, in one shared classroom with a section for each option.'

export function programOptionConfig(slug: string | null | undefined): ProgramOptionConfig | null {
  return slug ? (PROGRAM_OPTION_CONFIG[slug] ?? null) : null
}

// Billed hourly instead of by a generated fee.
export function isHourlyProgram(slug: string | null | undefined): boolean {
  return programOptionConfig(slug) !== null
}

// Checks a submitted list against the program's fixed options. Returns the
// cleaned list (deduplicated, in the program's own order) or an error message.
// A program with no options ignores whatever was sent and stores none; one with
// options needs at least one, and rejects anything not on its list, since the
// checkboxes are UX only and a form post can carry any string.
export function validateProgramOptions(
  slug: string | null | undefined,
  submitted: string[]
): { ok: true; options: string[] } | { ok: false; error: string } {
  const config = programOptionConfig(slug)
  if (!config) return { ok: true, options: [] }

  const unique = [...new Set(submitted.map((s) => s.trim()).filter(Boolean))]
  if (unique.length === 0) {
    return { ok: false, error: `Choose at least one of the ${config.optionsLabel} for this program.` }
  }
  if (unique.some((o) => !config.options.includes(o))) {
    return { ok: false, error: `Choose only from the listed ${config.optionsLabel}.` }
  }
  return { ok: true, options: config.options.filter((o) => unique.includes(o)) }
}

// Same check, looking the program up by id first (for server actions that only
// have a classroom id). An unknown id is the caller's own error to report.
export async function validateProgramOptionsForClassroom(
  supabase: SupabaseClient,
  classroomId: string,
  submitted: string[]
): Promise<{ ok: true; options: string[] } | { ok: false; error: string }> {
  const { data: classroom } = await supabase.from('classrooms').select('slug').eq('id', classroomId).maybeSingle()
  if (!classroom) return { ok: false, error: 'Please select a valid program.' }
  return validateProgramOptions(classroom.slug, submitted)
}
