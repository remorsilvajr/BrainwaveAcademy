'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AvatarEditor } from '@/components/ui/avatar-editor'
import { updateStudentAvatar, removeStudentAvatar } from '@/app/parent/students/actions'

export function StudentAvatarEditor({ studentId, avatarUrl }: { studentId: string; avatarUrl: string | null }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleFileSelected(file: File) {
    setIsSaving(true)
    setErrorMessage('')
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      await updateStudentAvatar(studentId, formData)
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove() {
    setIsSaving(true)
    setErrorMessage('')
    try {
      await removeStudentAvatar(studentId)
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <AvatarEditor
        imageUrl={avatarUrl}
        onFileSelected={handleFileSelected}
        onRemove={avatarUrl ? handleRemove : undefined}
        disabled={isSaving}
      />
      {errorMessage && <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{errorMessage}</p>}
    </div>
  )
}
