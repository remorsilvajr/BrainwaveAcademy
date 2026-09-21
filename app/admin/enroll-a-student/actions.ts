'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { generateUnknownPassword } from '@/lib/password'
import { sendSetPasswordEmail } from '@/lib/set-password-link'
import { notifyUsers } from '@/lib/notify'
import { logActivity } from '@/lib/activity-log'
import { getSiteUrl } from '@/lib/site-url'
import { genderFromParentRelationship } from '@/lib/gender'
import { requireAdmin } from '@/lib/require-admin'
import { normalizeEmail } from '@/lib/email-validation'
import { enrollmentApprovedEmail, enrollmentCorrectionEmail, enrollmentRejectedEmail } from '@/lib/notification-emails'

// Approves an enrollment request. Since the public form now creates the parent's
// account (with the password they chose) at the moment they submit, there is nothing
// to create here: this marks the request approved, tells the parent (email and an
// in-portal notification) and points them at Requirements. The student record is
// intentionally NOT created here either. It's created later, in
// app/admin/applications/actions.ts, only after the parent has uploaded documents and
// admin has validated them.
//
// A request from before that change has no account yet (created_parent_id is null):
// for those the parent account is created here as it always was, except the account
// starts with a random password nobody sees and the parent is emailed a one-time link
// to choose their own, instead of a temporary password.
export async function approveApplication(applicationId: string, note?: string): Promise<{ error: string } | undefined> {
  // This can create a real auth.users account via the service-role client, which
  // bypasses RLS: see lib/require-admin.ts.
  await requireAdmin()

  const supabase = await createClient()
  const admin = createAdminClient()
  const trimmedNote = (note ?? '').trim()
  if (trimmedNote.length > 1000) return { error: 'The note must be 1000 characters or fewer.' }

  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    return { error: 'Application not found.' }
  }
  if (application.status !== 'pending_review') {
    return { error: 'This request has already been handled.' }
  }

  const parentEmail = normalizeEmail(application.parent_email)
  let parentId: string | null = application.created_parent_id
  let needsPasswordLink = false

  if (!parentId) {
    // An older request. An application only ever reuses an existing *parent* account:
    // the email could have been registered to a teacher/admin (or a since-deleted
    // account) after the request was submitted, and silently attaching the child to one
    // of those would link a student to someone who isn't their guardian.
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

    parentId = existingProfile?.id ?? null

    if (!parentId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: parentEmail,
        password: generateUnknownPassword(),
        email_confirm: true,
      })
      if (createError || !created.user) {
        return { error: createError?.message ?? 'Could not create the parent account.' }
      }
      parentId = created.user.id
      needsPasswordLink = true

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
        await admin.auth.admin.deleteUser(parentId)
        return { error: profileError.message }
      }

      // Every parent account starts with a wallet: see the Payments & wallet note in
      // CLAUDE.md. Best-effort: the account itself already committed above.
      const { error: walletError } = await supabase.from('wallets').insert({ parent_id: parentId })
      if (walletError) {
        console.error('Failed to create wallet for new parent account:', walletError.message)
      }
    }
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status: 'approved',
      created_parent_id: parentId,
      reviewed_at: new Date().toISOString(),
      review_notes: trimmedNote || null,
    })
    .eq('id', application.id)
    .eq('status', 'pending_review')

  if (updateError) {
    return { error: updateError.message }
  }

  const siteUrl = getSiteUrl()
  const studentName = `${application.student_first_name} ${application.student_last_name}`

  // Best-effort, like logActivity: the approval is already committed, so a failed
  // email shouldn't fail it.
  try {
    const mail = enrollmentApprovedEmail({
      parentFirstName: application.parent_first_name,
      studentName,
      note: trimmedNote || null,
      siteUrl,
    })
    await sendEmail({ to: parentEmail, subject: mail.subject, html: mail.html })
  } catch (err) {
    console.error('sendEmail failed for the enrollment approved email:', err)
  }
  if (needsPasswordLink) {
    const failure = await sendSetPasswordEmail({
      email: parentEmail,
      firstName: application.parent_first_name,
      kind: 'welcome',
    })
    if (failure) console.error('The set-password email for an approved older request failed:', failure.error)
  }

  await notifyUsers([parentId as string], {
    kind: 'request',
    title: 'Enrollment request approved',
    body: `${studentName}'s request was approved. Upload the requirements to continue.`,
    href: `/parent/requirements?student=${application.id}`,
  })

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Approved enrollment request for ${studentName}`,
    targetTable: 'applications',
    targetId: application.id,
  })

  revalidatePath('/admin/enroll-a-student')
  revalidatePath('/admin/applications')
  revalidatePath('/parent/enrollment-status')
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
    .select('id, created_parent_id, parent_email, parent_first_name, student_first_name, student_last_name')
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  // The email always goes out (an older request's parent has no account to see a
  // notification in); a parent with an account also gets the in-portal one.
  if (rejected?.created_parent_id) {
    await notifyUsers([rejected.created_parent_id], {
      kind: 'request',
      title: 'Enrollment request not approved',
      body: `${rejected.student_first_name} ${rejected.student_last_name}: ${trimmedReason}`,
      href: `/parent/enrollment-status?student=${rejected.id}`,
    })
  }

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

// Asks the parent to fix details on the request itself (a document correction is a
// separate step in Applications). The request moves to needs_correction and waits for the
// parent to edit and resubmit it (app/parent/enrollment-status/edit), which puts it back in
// the pending queue. A written note is required: it is emailed, shown on their Enrollment
// Status page and sent as an in-portal notification. Only possible for a request that
// belongs to an account, since only that parent can edit it.
export async function requestApplicationCorrection(applicationId: string, note: string): Promise<{ error: string } | undefined> {
  await requireAdmin()

  const trimmedNote = note.trim()
  if (trimmedNote.length < 5) return { error: 'Please explain what needs to be corrected, so the parent knows.' }
  if (trimmedNote.length > 1000) return { error: 'The note must be 1000 characters or fewer.' }

  const supabase = await createClient()
  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('id, status, created_parent_id, parent_email, parent_first_name, student_first_name, student_last_name')
    .eq('id', applicationId)
    .single()
  if (fetchError || !application) return { error: 'Application not found.' }
  if (application.status !== 'pending_review') return { error: 'This request has already been handled.' }
  if (!application.created_parent_id) {
    return { error: 'This older request has no parent account to edit it. Approve or reject it instead.' }
  }

  const { data: updated, error } = await supabase
    .from('applications')
    .update({ status: 'needs_correction', review_notes: trimmedNote, reviewed_at: new Date().toISOString() })
    .eq('id', applicationId)
    .eq('status', 'pending_review')
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'This request has already been handled.' }

  const studentName = `${application.student_first_name} ${application.student_last_name}`
  try {
    const mail = enrollmentCorrectionEmail({
      parentFirstName: application.parent_first_name,
      studentName,
      note: trimmedNote,
      siteUrl: getSiteUrl(),
    })
    await sendEmail({ to: application.parent_email, subject: mail.subject, html: mail.html })
  } catch (err) {
    console.error('sendEmail failed for the enrollment correction request:', err)
  }

  await notifyUsers([application.created_parent_id], {
    kind: 'request',
    title: 'A correction is needed on your enrollment request',
    body: `${studentName}: ${trimmedNote}`.slice(0, 200),
    href: `/parent/enrollment-status?student=${application.id}`,
  })

  const {
    data: { user: actingAdmin },
  } = await supabase.auth.getUser()
  await logActivity(supabase, {
    actorId: actingAdmin?.id ?? null,
    action: `Requested a correction on the enrollment request for ${studentName}`,
    targetTable: 'applications',
    targetId: applicationId,
  })

  revalidatePath('/admin/enroll-a-student')
  revalidatePath('/parent/enrollment-status')
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