'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { generateTempPassword } from '@/lib/password'
import { logActivity } from '@/lib/activity-log'
import { getSiteUrl } from '@/lib/site-url'
import { genderFromParentRelationship } from '@/lib/gender'

// Creates ONLY the parent account. The student record is intentionally NOT
// created here — it's created later, in app/admin/applications/actions.ts,
// only after the parent has uploaded documents and admin has validated them.
export async function approveApplication(applicationId: string) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    throw new Error('Application not found.')
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', application.parent_email)
    .maybeSingle()

  let parentId = existingProfile?.id
  let tempPassword: string | null = null

  if (!parentId) {
    tempPassword = generateTempPassword()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: application.parent_email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createError || !created.user) {
      throw new Error(createError?.message ?? 'Could not create the parent account.')
    }

    parentId = created.user.id

    const { error: profileError } = await supabase.from('profiles').insert({
      id: parentId,
      role: 'parent',
      first_name: application.parent_first_name,
      middle_name: application.parent_middle_name,
      last_name: application.parent_last_name,
      email: application.parent_email,
      phone_number: application.parent_contact_number,
      date_of_birth: application.parent_dob,
      relationship_to_student: application.parent_relationship,
      gender: genderFromParentRelationship(application.parent_relationship, application.parent_gender),
      is_verified: true,
      account_status: 'active',
    })

    if (profileError) {
      throw new Error(profileError.message)
    }
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status: 'approved',
      created_parent_id: parentId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', application.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  if (tempPassword) {
    const siteUrl = getSiteUrl()
    // Best-effort, like logActivity elsewhere — the account/student/link
    // rows above are already committed, so a failed welcome email shouldn't
    // fail the whole approval.
    try {
      await sendEmail({
        to: application.parent_email,
        subject: 'Your Brainwave Preschool Academy Parent Portal Account',
        html: `
          <h2>Welcome to Brainwave Preschool Academy!</h2>
          <p>Your enrollment request for ${application.student_first_name} ${application.student_last_name} has been approved.</p>
          <p>You can now log in to the Parent Portal with:</p>
          <p><strong>Email:</strong> ${application.parent_email}<br/>
          <strong>Temporary Password:</strong> ${tempPassword}</p>
          <p>For your security, please change this password after logging in (Sidebar &gt; Settings).</p>
          <p><strong>Next step:</strong> log in and visit the Requirements page to upload the documents needed to complete enrollment.</p>
          <p><a href="${siteUrl}/login">Log in to the Parent Portal</a></p>
        `,
      })
    } catch (err) {
      console.error('sendEmail failed for approveApplication welcome email:', err)
    }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Approved enrollment request for ${application.student_first_name} ${application.student_last_name}`,
    targetTable: 'applications',
    targetId: application.id,
  })

  revalidatePath('/admin/enroll-a-student')
  revalidatePath('/admin/applications')
}

export async function dismissApplication(applicationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Rejected enrollment request',
    targetTable: 'applications',
    targetId: applicationId,
  })

  revalidatePath('/admin/enroll-a-student')
}