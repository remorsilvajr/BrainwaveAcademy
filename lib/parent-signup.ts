import type { SupabaseClient } from '@supabase/supabase-js'

// Creates a brand-new parent account and their first enrollment request in one go,
// for the public /enroll form. Takes a service-role client so the caller (the Server
// Action, and the integration test) decides what "admin" means. Never logs, returns
// or stores the password: it goes straight to Supabase Auth, which keeps a bcrypt
// hash of it.
//
// Two rules close the gaps that come with creating an account before the email is
// proven to belong to the person:
//  - an email that already has an account is refused (no way to take one over);
//  - an email that already appears on an enrollment request nobody has claimed with an
//    account is refused too, because a parent sees their requests by matching email and a
//    new account for that address would otherwise see somebody else's older request.
// Every request made through this flow carries created_parent_id from the start, so
// after the older requests are worked through only the first rule ever applies.

export type ParentProfileInput = {
  first_name: string
  middle_name: string | null
  last_name: string
  phone_number: string
  date_of_birth: string
  relationship_to_student: string
  gender: string | null
}

export type SignupResult =
  | { ok: true; userId: string; applicationId: string }
  | { ok: false; error: string; field?: 'email' | 'password' }

export async function createParentWithApplication(
  admin: SupabaseClient,
  input: {
    email: string
    password: string
    profile: ParentProfileInput
    // Every applications column the form fills in. created_parent_id is set here.
    application: Record<string, unknown>
  }
): Promise<SignupResult> {
  const { email, password, profile, application } = input

  const { data: existingProfile } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existingProfile) {
    return {
      ok: false,
      field: 'email',
      error: 'An account already exists with this email. Please log in and use Enroll A Student in your portal to add another child.',
    }
  }

  const { data: unclaimed } = await admin
    .from('applications')
    .select('id')
    .eq('parent_email', email)
    .is('created_parent_id', null)
    .limit(1)
  if (unclaimed && unclaimed.length > 0) {
    return {
      ok: false,
      field: 'email',
      error: 'We already have an enrollment request for this email. Please wait for the school to get back to you, or contact the school office.',
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    // Supabase enforces its own password rules too (set in its dashboard). Its message
    // says which rule ("Password should be at least ... characters") and never contains
    // the password, so show it: hiding it left someone with matching, valid-looking
    // passwords and no idea why the account wasn't created.
    if (createError?.code === 'weak_password') {
      return { ok: false, field: 'password', error: createError.message }
    }
    return { ok: false, error: 'Could not create your account. Please try again.' }
  }
  const userId = created.user.id

  // Undo everything created so far, so a failure never leaves a login with no profile
  // or a half-made application behind.
  const rollback = async (applicationId?: string) => {
    if (applicationId) await admin.from('applications').delete().eq('id', applicationId)
    await admin.from('wallets').delete().eq('parent_id', userId)
    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    role: 'parent',
    email,
    ...profile,
    is_verified: true,
    account_status: 'active',
  })
  if (profileError) {
    await rollback()
    return { ok: false, error: 'Could not create your account. Please try again.' }
  }

  // Every parent starts with a wallet (see the Payments & wallet note in CLAUDE.md).
  // Best-effort like every other place a parent account is made.
  const { error: walletError } = await admin.from('wallets').insert({ parent_id: userId })
  if (walletError) console.error('Failed to create wallet for new parent account:', walletError.message)

  const { data: inserted, error: applicationError } = await admin
    .from('applications')
    .insert({ ...application, parent_email: email, created_parent_id: userId })
    .select('id')
    .single()
  if (applicationError || !inserted) {
    await rollback()
    return { ok: false, error: 'Something went wrong submitting your application. Please try again.' }
  }

  return { ok: true, userId, applicationId: inserted.id }
}
