'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateStudentRecord(
  studentId: string,
  updates: {
    first_name: string
    middle_name: string
    last_name: string
    date_of_birth: string
    gender: string
  }
) {
  const supabase = await createClient()

  const firstName = updates.first_name.trim()
  const lastName = updates.last_name.trim()

  if (!firstName || !lastName || !updates.date_of_birth || !updates.gender) {
    throw new Error('First name, last name, date of birth, and gender are required.')
  }

  const { error } = await supabase
    .from('students')
    .update({
      first_name: firstName,
      middle_name: updates.middle_name.trim() || null,
      last_name: lastName,
      date_of_birth: updates.date_of_birth,
      gender: updates.gender,
    })
    .eq('id', studentId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/students')
}
