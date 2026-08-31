'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { generateTempPassword } from '@/lib/password'
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/phone'
import { isValidName, NAME_VALIDATION_MESSAGE } from '@/lib/name'
import { logActivity } from '@/lib/activity-log'
import { getSiteUrl } from '@/lib/site-url'

export type CreateSystemUserState = {
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
}

const roles = ['parent', 'teacher', 'admin']

export async function createSystemUser(
  _prevState: CreateSystemUserState,
  formData: FormData
): Promise<CreateSystemUserState> {
  const values: Record<string, string> = {
    first_name: ((formData.get('first_name') as string) ?? '').trim(),
    middle_name: ((formData.get('middle_name') as string) ?? '').trim(),
    last_name: ((formData.get('last_name') as string) ?? '').trim(),
    email: ((formData.get('email') as string) ?? '').trim().toLowerCase(),
    phone_number: ((formData.get('phone_number') as string) ?? '').trim(),
    role: ((formData.get('role') as string) ?? '').trim(),
    relationship_to_student: ((formData.get('relationship_to_student') as string) ?? '').trim(),
    gender: ((formData.get('gender') as string) ?? '').trim(),
  }
  const autoGenerate = formData.get('auto_generate') === 'on'
  const manualPassword = ((formData.get('manual_password') as string) ?? '').trim()
  const photo = formData.get('profile_photo') as File | null

  const fieldErrors: Record<string, string> = {}

  if (!values.first_name) {
    fieldErrors.first_name = 'First name is required.'
  } else if (!isValidName(values.first_name)) {
    fieldErrors.first_name = NAME_VALIDATION_MESSAGE
  }
  if (!values.last_name) {
    fieldErrors.last_name = 'Last name is required.'
  } else if (!isValidName(values.last_name)) {
    fieldErrors.last_name = NAME_VALIDATION_MESSAGE
  }
  if (values.middle_name && !isValidName(values.middle_name)) {
    fieldErrors.middle_name = NAME_VALIDATION_MESSAGE
  }
  if (!roles.includes(values.role)) fieldErrors.role = 'Select a role.'

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!values.email) {
    fieldErrors.email = 'Email address is required.'
  } else if (!emailPattern.test(values.email)) {
    fieldErrors.email = 'Please enter a valid email address.'
  }

  if (values.phone_number && !isValidPhilippineMobile(values.phone_number)) {
    fieldErrors.phone_number = 'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.'
  }

  if (!autoGenerate && manualPassword.length < 8) {
    fieldErrors.manual_password = 'Password must be at least 8 characters.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Please fix the highlighted fields below.', fieldErrors, values }
  }

  const admin = createAdminClient()

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', values.email)
    .maybeSingle()

  if (existingProfile) {
    return {
      error: 'An account already exists with this email.',
      fieldErrors: { email: 'This email is already in use.' },
      values,
    }
  }

  const password = autoGenerate ? generateTempPassword() : manualPassword

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: values.email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return { error: createError?.message ?? 'Could not create the account.', values }
  }

  const userId = created.user.id

  let avatarUrl: string | null = null
  if (photo && photo.size > 0) {
    const extension = photo.name.split('.').pop() || 'jpg'
    const path = `${userId}/avatar.${extension}`
    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(path, photo, { upsert: true })

    if (!uploadError) {
      avatarUrl = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    // A failed photo upload isn't worth blocking account creation over —
    // the admin can add one later via the account's own profile.
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    role: values.role,
    first_name: values.first_name,
    middle_name: values.middle_name || null,
    last_name: values.last_name,
    email: values.email,
    phone_number: values.phone_number ? normalizePhilippineMobile(values.phone_number) : null,
    relationship_to_student: values.role === 'parent' ? values.relationship_to_student || null : null,
    gender: values.role === 'teacher' ? values.gender || null : null,
    avatar_url: avatarUrl,
    is_verified: true,
    account_status: 'active',
  })

  if (profileError) {
    // Roll back the auth user so a failed profile insert doesn't leave a
    // login-capable account with no matching profile row.
    await admin.auth.admin.deleteUser(userId)
    return { error: profileError.message, values }
  }

  const supabase = await createClient()
  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Created ${values.role} account for ${values.email}`,
    targetTable: 'profiles',
    targetId: userId,
  })

  if (autoGenerate) {
    const siteUrl = getSiteUrl()
    await sendEmail({
      to: values.email,
      subject: 'Your Brainwave Preschool Academy Account',
      html: `
        <h2>Welcome to Brainwave Preschool Academy!</h2>
        <p>An account has been created for you.</p>
        <p><strong>Email:</strong> ${values.email}<br/>
        <strong>Temporary Password:</strong> ${password}</p>
        <p>For your security, please change this password after logging in.</p>
        <p><a href="${siteUrl}/login">Log in</a></p>
      `,
    })
  }

  redirect('/admin/user-management')
}
