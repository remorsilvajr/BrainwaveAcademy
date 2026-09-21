'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { isTerminalStudentStatus } from '@/lib/student-status'
import { validateHealthInput, type HealthInput } from '@/lib/health'

// Shared by the parent's Health & Emergency page and the admin's Student Record.
// Who may write is decided by RLS on the regular client (a parent only for their
// own linked children, admin for any), so no extra ownership check is needed and
// nothing here uses the service-role client. Returns `{ error }` instead of
// throwing (a thrown Server Function error is redacted in production).
export async function saveHealthInfo(studentId: string, input: HealthInput): Promise<{ error: string } | undefined> {
  const checked = validateHealthInput(input)
  if ('error' in checked) return { error: checked.error }
  const value = checked.value

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please log in again.' }

  // Read through RLS: a child that isn't yours (or doesn't exist) isn't found.
  const { data: student } = await supabase.from('students').select('id, first_name, enrollment_status').eq('id', studentId).maybeSingle()
  if (!student) return { error: 'That student could not be found.' }
  if (isTerminalStudentStatus(student.enrollment_status)) {
    return { error: `${student.first_name} is no longer enrolled, so this can't be changed.` }
  }

  const { data: saved, error } = await supabase
    .from('student_health')
    .upsert(
      {
        student_id: studentId,
        allergies: value.allergies || null,
        severe_allergy: value.severeAllergy,
        medical_conditions: value.medicalConditions || null,
        medications: value.medications || null,
        doctor_name: value.doctorName || null,
        doctor_phone: value.doctorPhone || null,
        preferred_hospital: value.preferredHospital || null,
        notes: value.notes || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id' }
    )
    .select('student_id')
  if (error) return { error: error.message }
  if (!saved || saved.length === 0) return { error: "You can't change this child's health information." }

  // Contacts are stored by position 1-3: write the ones given, remove the rest.
  for (let position = 1; position <= 3; position++) {
    const contact = value.contacts[position - 1]
    const result = contact
      ? await supabase.from('emergency_contacts').upsert(
          { student_id: studentId, position, full_name: contact.fullName, relationship: contact.relationship, phone_number: contact.phoneNumber },
          { onConflict: 'student_id,position' }
        )
      : await supabase.from('emergency_contacts').delete().eq('student_id', studentId).eq('position', position)
    if (result.error) return { error: `Health details were saved, but the emergency contacts could not be: ${result.error.message}` }
  }

  // Deliberately no health text in the activity log (it's sensitive and the log
  // is broadly readable by admins): only that the record changed.
  await logActivity(supabase, {
    actorId: user.id,
    action: `Updated health and emergency information for ${student.first_name}`,
    targetTable: 'students',
    targetId: studentId,
  })

  for (const path of ['/parent/health', '/admin/students', '/teacher/student-dashboard', '/admin/student-dashboard', '/parent/student-dashboard', '/teacher/attendance', '/admin/attendance']) {
    revalidatePath(path)
  }
}
