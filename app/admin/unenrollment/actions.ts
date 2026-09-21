'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { logActivity } from '@/lib/activity-log'
import { escapeHtml, sendEmail } from '@/lib/email'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { getSiteUrl } from '@/lib/site-url'
import { UNENROLLMENT_REASON_MAX, UNENROLLMENT_REASON_MIN, type FeeDecision } from '@/lib/unenrollment'

// Every expected failure is returned as `{ error }`, never thrown, since a thrown
// Server Function error is redacted in a production build.

function revalidateAll() {
  for (const path of [
    '/admin',
    '/admin/unenrollment',
    '/admin/students',
    '/admin/classrooms',
    '/admin/payments',
    '/admin/attendance',
    '/teacher',
    '/teacher/attendance',
    '/parent/unenrollment',
    '/parent/students',
    '/parent/payments',
    '/parent/pickup',
  ]) {
    revalidatePath(path)
  }
}

type Loaded = {
  request: { id: string; student_id: string; requested_by: string; last_day: string; reason: string; status: string }
  student: { id: string; first_name: string; last_name: string; enrollment_status: string }
  parent: { email: string; first_name: string } | null
}

async function loadPending(requestId: string): Promise<Loaded | { error: string }> {
  const supabase = await createClient()
  const { data: request } = await supabase
    .from('unenrollment_requests')
    .select('id, student_id, requested_by, last_day, reason, status')
    .eq('id', requestId)
    .maybeSingle()
  if (!request) return { error: 'That request could not be found.' }
  if (request.status !== 'pending') return { error: 'This request has already been handled.' }

  const [{ data: student }, { data: parent }] = await Promise.all([
    supabase.from('students').select('id, first_name, last_name, enrollment_status').eq('id', request.student_id).maybeSingle(),
    supabase.from('profiles').select('email, first_name').eq('id', request.requested_by).maybeSingle(),
  ])
  if (!student) return { error: 'The student for this request could not be found.' }
  return { request, student, parent: parent ?? null }
}

// Approving withdraws the child and settles their unpaid fees. The admin has to
// say what happens to those fees each time (keep them collectible, or waive
// them), since the right answer depends on the family and the circumstances.
export async function approveUnenrollment(
  requestId: string,
  feeDecision: FeeDecision | null,
  note: string
): Promise<{ error: string } | undefined> {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const loaded = await loadPending(requestId)
  if ('error' in loaded) return loaded
  const { request, student, parent } = loaded

  if (student.enrollment_status === 'withdrawn' || student.enrollment_status === 'graduated') {
    return { error: `${student.first_name} is already ${student.enrollment_status}.` }
  }

  const { data: unpaid } = await supabase
    .from('payments')
    .select('id, amount')
    .eq('student_id', student.id)
    .eq('status', 'pending')
  const unpaidFees = unpaid ?? []
  if (unpaidFees.length > 0 && feeDecision !== 'keep' && feeDecision !== 'waive') {
    return { error: 'Choose what happens to the unpaid fees: keep them collectible, or waive them.' }
  }
  const trimmedNote = note.trim()
  if (trimmedNote.length > UNENROLLMENT_REASON_MAX) {
    return { error: `The note must be ${UNENROLLMENT_REASON_MAX} characters or fewer.` }
  }

  // Claim the request first (guarded on status, so two admins can't both apply
  // it), then change the student, then the fees. If the student update fails the
  // claim is released again so the request isn't stuck as approved.
  const { data: claimed, error: claimError } = await supabase
    .from('unenrollment_requests')
    .update({
      status: 'approved',
      fee_decision: unpaidFees.length > 0 ? feeDecision : null,
      review_note: trimmedNote || null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
  if (claimError) return { error: claimError.message }
  if (!claimed || claimed.length === 0) return { error: 'This request has already been handled.' }

  const { error: studentError } = await supabase
    .from('students')
    .update({ enrollment_status: 'withdrawn' })
    .eq('id', student.id)
  if (studentError) {
    await supabase
      .from('unenrollment_requests')
      .update({ status: 'pending', fee_decision: null, review_note: null, reviewed_by: null, reviewed_at: null })
      .eq('id', requestId)
    return { error: studentError.message }
  }

  let waivedTotal = 0
  if (unpaidFees.length > 0 && feeDecision === 'waive') {
    const { error: waiveError } = await supabase
      .from('payments')
      .update({ status: 'waived' })
      .eq('student_id', student.id)
      .eq('status', 'pending')
    if (waiveError) {
      return { error: `${student.first_name} was withdrawn, but the fees could not be waived: ${waiveError.message}` }
    }
    waivedTotal = unpaidFees.reduce((sum, p) => sum + p.amount, 0)
  }

  await logActivity(supabase, {
    actorId: admin.id,
    action: `Approved unenrollment for ${student.first_name} ${student.last_name}${
      feeDecision === 'waive' && waivedTotal > 0 ? ` (waived ${formatCurrency(waivedTotal)} in unpaid fees)` : ''
    }`,
    targetTable: 'students',
    targetId: student.id,
  })

  if (parent?.email) {
    try {
      const feeLine =
        unpaidFees.length === 0
          ? ''
          : feeDecision === 'waive'
            ? `<p>The unpaid fees on ${escapeHtml(student.first_name)}'s account (${formatCurrency(waivedTotal)}) have been waived.</p>`
            : `<p>Any unpaid fees on ${escapeHtml(student.first_name)}'s account remain due. You can review them under Payments in your portal.</p>`
      await sendEmail({
        to: parent.email,
        subject: `Unenrollment approved for ${student.first_name}`,
        html: `
          <h2>Unenrollment approved</h2>
          <p>Hi ${escapeHtml(parent.first_name)}, we've approved your request to unenroll <strong>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</strong>. Their last day was set as ${formatDateLong(request.last_day)}.</p>
          ${feeLine}
          ${trimmedNote ? `<p><strong>Note from the school:</strong> ${escapeHtml(trimmedNote)}</p>` : ''}
          <p>Your child's records and receipts stay available in your portal. If you'd like to enroll again later, you can submit a new enrollment request any time.</p>
          <p><a href="${getSiteUrl()}/login">Log in</a></p>
        `,
      })
    } catch (err) {
      // The withdrawal is already committed, so a failed email is only logged.
      console.error('sendEmail failed for approveUnenrollment:', err)
    }
  }

  revalidateAll()
}

export async function declineUnenrollment(requestId: string, note: string): Promise<{ error: string } | undefined> {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const trimmedNote = note.trim()
  if (trimmedNote.length < UNENROLLMENT_REASON_MIN) {
    return { error: 'Please explain why the request is declined, so the family knows.' }
  }
  if (trimmedNote.length > UNENROLLMENT_REASON_MAX) {
    return { error: `The note must be ${UNENROLLMENT_REASON_MAX} characters or fewer.` }
  }

  const loaded = await loadPending(requestId)
  if ('error' in loaded) return loaded
  const { student, parent } = loaded

  const { data: updated, error } = await supabase
    .from('unenrollment_requests')
    .update({
      status: 'declined',
      review_note: trimmedNote,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) return { error: 'This request has already been handled.' }

  await logActivity(supabase, {
    actorId: admin.id,
    action: `Declined unenrollment for ${student.first_name} ${student.last_name}`,
    targetTable: 'students',
    targetId: student.id,
  })

  if (parent?.email) {
    try {
      await sendEmail({
        to: parent.email,
        subject: `Unenrollment request for ${student.first_name}`,
        html: `
          <h2>About your unenrollment request</h2>
          <p>Hi ${escapeHtml(parent.first_name)}, we're not able to process your request to unenroll <strong>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</strong> at this time.</p>
          <p><strong>Note from the school:</strong> ${escapeHtml(trimmedNote)}</p>
          <p>${escapeHtml(student.first_name)} remains enrolled. If you have questions, please contact the school office, or file a new request from your portal.</p>
          <p><a href="${getSiteUrl()}/login">Log in</a></p>
        `,
      })
    } catch (err) {
      console.error('sendEmail failed for declineUnenrollment:', err)
    }
  }

  revalidateAll()
}
