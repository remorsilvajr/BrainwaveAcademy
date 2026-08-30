'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SubmitApplicationState = {
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
}

const requiredFields: Record<string, string> = {
  student_first_name: 'Student first name',
  student_last_name: 'Student last name',
  student_dob: "Student's date of birth",
  student_gender: 'Student gender',
  parent_first_name: 'Parent first name',
  parent_last_name: 'Parent last name',
  parent_dob: "Parent's date of birth",
  parent_relationship: 'Relationship',
  parent_contact_number: 'Contact number',
  parent_email: 'Email address',
}

const allFieldKeys = [...Object.keys(requiredFields), 'student_middle_name', 'parent_middle_name']

const nameFields = [
  'student_first_name',
  'student_middle_name',
  'student_last_name',
  'parent_first_name',
  'parent_middle_name',
  'parent_last_name',
]

const documentFields: { key: string; type: string; label: string }[] = [
  { key: 'doc_birth_certificate', type: 'birth_certificate', label: 'Birth Certificate' },
  { key: 'doc_id_photo', type: 'id_photo', label: '2x2 ID Photo' },
  { key: 'doc_proof_of_address', type: 'proof_of_address', label: 'Proof of Address' },
  { key: 'doc_guardian_id', type: 'guardian_valid_id', label: "Parent/Guardian Valid ID" },
]

const NAME_PATTERN = /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/

function isValidName(value: string) {
  return NAME_PATTERN.test(value)
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])([a-zà-öø-ÿ])/g, (_match, sep, char) => sep + char.toUpperCase())
}

function isValidPhilippineMobile(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return /^9\d{9}$/.test(digits) || /^09\d{9}$/.test(digits) || /^639\d{9}$/.test(digits)
}

function normalizePhilippineMobile(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('63')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits
  return `+63 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

export async function submitApplication(
  _prevState: SubmitApplicationState,
  formData: FormData
): Promise<SubmitApplicationState> {
  const values: Record<string, string> = {}
  for (const key of allFieldKeys) {
    values[key] = ((formData.get(key) as string) ?? '').trim()
  }

  const fieldErrors: Record<string, string> = {}

  for (const [key, label] of Object.entries(requiredFields)) {
    if (!values[key]) {
      fieldErrors[key] = `${label} is required.`
    }
  }

  for (const key of nameFields) {
    const value = values[key]
    if (value && !isValidName(value)) {
      fieldErrors[key] = 'Only letters, spaces, hyphens, and apostrophes are allowed.'
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (values.parent_email && !emailPattern.test(values.parent_email)) {
    fieldErrors.parent_email = 'Please enter a valid email address.'
  }

  if (values.parent_contact_number && !isValidPhilippineMobile(values.parent_contact_number)) {
    fieldErrors.parent_contact_number =
      'Enter a valid PH mobile number, e.g. 0917 123 4567 or +63 917 123 4567.'
  }

  if (values.student_dob && values.parent_dob && !fieldErrors.student_dob && !fieldErrors.parent_dob) {
    const studentDob = new Date(values.student_dob)
    const parentDob = new Date(values.parent_dob)
    const minParentDob = new Date(studentDob)
    minParentDob.setFullYear(minParentDob.getFullYear() - 10)
    if (parentDob > minParentDob) {
      fieldErrors.parent_dob =
        "Parent must be at least 10 years older than the student. Please check the date of birth."
    }
  }

  // Document uploads
  const files: Record<string, File> = {}
  for (const doc of documentFields) {
    const file = formData.get(doc.key)
    if (!(file instanceof File) || file.size === 0) {
      fieldErrors[doc.key] = `${doc.label} is required.`
    } else {
      files[doc.key] = file
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: 'Please fix the highlighted fields below.',
      fieldErrors,
      values,
    }
  }

  const supabase = await createClient()

  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      student_first_name: toTitleCase(values.student_first_name),
      student_middle_name: values.student_middle_name ? toTitleCase(values.student_middle_name) : null,
      student_last_name: toTitleCase(values.student_last_name),
      student_dob: values.student_dob,
      student_gender: values.student_gender,
      parent_first_name: toTitleCase(values.parent_first_name),
      parent_middle_name: values.parent_middle_name ? toTitleCase(values.parent_middle_name) : null,
      parent_last_name: toTitleCase(values.parent_last_name),
      parent_dob: values.parent_dob,
      parent_relationship: values.parent_relationship,
      parent_contact_number: normalizePhilippineMobile(values.parent_contact_number),
      parent_email: values.parent_email.toLowerCase(),
    })
    .select()
    .single()

  if (error || !application) {
    return {
      // TEMPORARY DEBUG — remove the "DEBUG:" prefix once reliably working.
      error: `DEBUG: ${error?.message ?? 'Could not save application.'}`,
      values,
    }
  }

  for (const doc of documentFields) {
    const file = files[doc.key]
    const extension = file.name.split('.').pop() || 'bin'
    const path = `${application.id}/${doc.type}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      return {
        error: `DEBUG: Application saved, but uploading ${doc.label} failed: ${uploadError.message}`,
        values,
      }
    }

    await supabase.from('application_documents').insert({
      application_id: application.id,
      document_type: doc.type,
      file_url: path,
      verification_status: 'pending',
    })
  }

  redirect('/enroll?submitted=true')
}
