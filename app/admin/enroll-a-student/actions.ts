'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { generateTempPassword } from '@/lib/password'
import { logActivity } from '@/lib/activity-log'
import { getSiteUrl } from '@/lib/site-url'
import { genderFromParentRelationship } from '@/lib/gender'
import { requireAdmin } from '@/lib/require-admin'
import { normalizeEmail } from '@/lib/email-validation'
import { enrollmentApprovedExistingParentEmail, enrollmentRejectedEmail } from '@/lib/notification-emails'

// Creates ONLY the parent account. The student record is intentionally NOT
// created here — it's created later, in app/admin/applications/actions.ts,
// only after the parent has uploaded documents and admin has validated them.
export async function approveApplication(applicationId: string): Promise<{ error: string } | undefined> {
  // This creates a real auth.users account via the service-role client
  // below, which bypasses RLS — without this check, any authenticated
  // caller could invoke this action directly (see lib/require-admin.ts)
  // and trigger account creation for an arbitrary application's parent,
  // even though the applications/profiles RLS policies would separately
  // block the rest of the approval from completing for a non-admin.
  await requireAdmin()

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    return { error: 'Application not found.' }
  }

  // An application only ever reuses an existing *parent* account. The email
  // could have been registered to a teacher/admin (or a since-deleted account)
  // after the request was submitted, and silently attaching the child to one of
  // those would link a student to someone who isn't their guardian.
  const parentEmail = normalizeEmail(application.parent_email)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role, deleted_at')
    .eq('email', parentEmail)
    .maybeSingle()

  if (existingProfile && existingProfile.role !== 'parent') {
    return { error: 'This email already belongs to a non-parent account, so the request cannot be approved as is.' }
  }
  if (existingProfile?.deleted_at) {
    return { error: 'The account for this email was deleted. Restore it or reject this request.' }
  }

  let parentId = existingProfile?.id
  let tempPassword: string | null = null

  if (!parentId) {
    tempPassword = generateTempPassword()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: parentEmail,
      password: tempPassword,
      email_confirm: true,
    })

    if (createError || !created.user) {
      return { error: createError?.message ?? 'Could not create the parent account.' }
    }

    parentId = created.user.id

    const { error: profileError } = await supabase.from('profiles').insert({
      id: parentId,
      role: 'parent',
      first_name: application.parent_first_name,
      middle_name: application.parent_middle_name,
      last_name: application.parent_last_name,
      email: parentEmail,
      phone_number: application.parent_contact_number,
      date_of_birth: application.parent_dob,
      relationship_to_student: application.parent_relationship,
      gender: genderFromParentRelationship(application.parent_relationship, application.parent_gender),
      is_verified: true,
      account_status: 'active',
    })

    if (profileError) {
      return { error: profileError.message }
    }

    // Every parent account starts with a ₱2,500 wallet balance — see the
    // Payments & wallet note in CLAUDE.md. Best-effort: a failed insert here
    // shouldn't fail the whole approval (the account itself already
    // committed above), the same reasoning as the welcome-email send below.
    const { error: walletError } = await supabase.from('wallets').insert({ parent_id: parentId })
    if (walletError) {
      console.error('Failed to create wallet for new parent account:', walletError.message)
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
    return { error: updateError.message }
  }

  // A parent who already had an account (a second child) gets no welcome email
  // (that one carries a new password), so tell them the request was approved.
  if (!tempPassword) {
    try {
      const mail = enrollmentApprovedExistingParentEmail({
        parentFirstName: application.parent_first_name,
        studentName: `${application.student_first_name} ${application.student_last_name}`,
        siteUrl: getSiteUrl(),
      })
      await sendEmail({ to: parentEmail, subject: mail.subject, html: mail.html })
    } catch (err) {
      console.error('sendEmail failed for the approved (existing parent) email:', err)
    }
  }

  if (tempPassword) {
    const siteUrl = getSiteUrl()
    // Best-effort, like logActivity elsewhere — the account/student/link
    // rows above are already committed, so a failed welcome email shouldn't
    // fail the whole approval.
    try {
      await sendEmail({
        to: parentEmail,
        subject: 'Your Brainwave Preschool Academy Parent Portal Account',
        html: `
          <h2>Welcome to Brainwave Preschool Academy!</h2>
          <p>Your enrollment request for ${application.student_first_name} ${application.student_last_name} has been approved.</p>
          <p>You can now log in to the Parent Portal with:</p>
          <p><strong>Email:</strong> ${parentEmail}<br/>
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

export async function dismissApplication(applicationId: string, reason: string): Promise<{ error: string } | undefined> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    return { error: 'Please explain why this request is being rejected.' }
  }

  const supabase = await createClient()

  const { data: rejected, error } = await supabase
    .from('applications')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      review_notes: trimmedReason,
    })
    .eq('id', applicationId)
    .select('parent_email, parent_first_name, student_first_name, student_last_name')
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  // The parent has no account yet at this stage, so email is the only way they
  // hear back (before this, the reason only showed in a portal they can't open).
  if (rejected?.parent_email) {
    try {
      const mail = enrollmentRejectedEmail({
        parentFirstName: rejected.parent_first_name,
        studentName: `${rejected.student_first_name} ${rejected.student_last_name}`,
        reason: trimmedReason,
        siteUrl: getSiteUrl(),
      })
      await sendEmail({ to: rejected.parent_email, subject: mail.subject, html: mail.html })
    } catch (err) {
      console.error('sendEmail failed for the enrollment rejection email:', err)
    }
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

// Archiving is orthogonal to status (an approved or rejected request can be
// archived, a still-open pending one can't — see the table's own guard on
// this) and never deletes the row — it's purely a "declutter the default
// tabs" flag, independent from the parent-facing hidden_from_parent column
// on the same table (see components/parent/remove-application-button.tsx).
// Reversible, so no confirm step in the UI.
export async function archiveApplication(applicationId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase.from('applications').update({ archived: true }).eq('id', applicationId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Archived enrollment request',
    targetTable: 'applications',
    targetId: applicationId,
  })

  revalidatePath('/admin/enroll-a-student')
}

export async function unarchiveApplication(applicationId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase.from('applications').update({ archived: false }).eq('id', applicationId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Unarchived enrollment request',
    targetTable: 'applications',
    targetId: applicationId,
  })

  revalidatePath('/admin/enroll-a-student')
}

// Soft delete, not a real row delete — never removes anything from the
// database. Any admin can delete any enrollment request regardless of
// status (unlike Archive, which excludes still-pending requests); this is
// a stronger, more final action than archiving, and takes priority over it
// — a deleted-but-archived row is excluded from every tab in
// EnrollmentRequestsTable, including its own Archived tab, not just the
// default view. Only visible again via /admin/deleted-items
// (super-admin-only) until restored.
export async function deleteApplication(applicationId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', applicationId)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: 'Deleted enrollment request',
    targetTable: 'applications',
    targetId: applicationId,
  })

  revalidatePath('/admin/enroll-a-student')
  revalidatePath('/admin/deleted-items')
}

// Bulk restore for the checkbox-list UI on /admin/deleted-items — restores
// every id in one call rather than the page firing one request per row.
export async function restoreApplications(applicationIds: string[]): Promise<{ error: string } | undefined> {
  if (applicationIds.length === 0) return

  const supabase = await createClient()

  const { error } = await supabase.from('applications').update({ deleted_at: null }).in('id', applicationIds)
  if (error) {
    return { error: error.message }
  }

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  for (const applicationId of applicationIds) {
    await logActivity(supabase, {
      actorId: actingAdmin?.id ?? null,
      action: 'Restored enrollment request',
      targetTable: 'applications',
      targetId: applicationId,
    })
  }

  revalidatePath('/admin/enroll-a-student')
  revalidatePath('/admin/deleted-items')
}