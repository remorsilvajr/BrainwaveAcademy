'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

function generateTempPassword() {
  const words = ['Maple', 'Tiger', 'River', 'Comet', 'Coral', 'Amber', 'Lunar', 'Sunny', 'Cedar', 'Pixel']
  const w1 = words[Math.floor(Math.random() * words.length)]
  const w2 = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(100 + Math.random() * 900)
  return `${w1}${w2}${num}`
}

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
      is_verified: true,
      account_status: 'active',
    })

    if (profileError) {
      throw new Error(profileError.message)
    }
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      application_id: application.id,
      first_name: application.student_first_name,
      middle_name: application.student_middle_name,
      last_name: application.student_last_name,
      date_of_birth: application.student_dob,
      gender: application.student_gender,
      enrollment_status: 'active',
    })
    .select()
    .single()

  if (studentError || !student) {
    throw new Error(studentError?.message ?? 'Could not create the student record.')
  }

  await supabase.from('parent_student').insert({
    parent_id: parentId,
    student_id: student.id,
    relationship: application.parent_relationship,
  })

  await supabase
    .from('applications')
    .update({
      status: 'approved',
      created_student_id: student.id,
      created_parent_id: parentId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', application.id)

  if (tempPassword) {
    await sendEmail({
      to: application.parent_email,
      subject: 'Your Brainwave Preschool Academy Parent Portal Account',
      html: `
        <h2>Welcome to Brainwave Preschool Academy!</h2>
        <p>${application.student_first_name} ${application.student_last_name}'s enrollment has been approved.</p>
        <p>You can now log in to the Parent Portal with:</p>
        <p><strong>Email:</strong> ${application.parent_email}<br/>
        <strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>For your security, please change this password after logging in (Sidebar &gt; Settings).</p>
        <p><a href="http://localhost:3000/login">Log in to the Parent Portal</a></p>
      `,
    })
  }

  revalidatePath('/admin/enroll-a-student')
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

  revalidatePath('/admin/enroll-a-student')
}
