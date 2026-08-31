'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { calculateAge, formatDateLong } from '@/lib/format'
import { documentLabels, documentOrder } from '@/lib/documents'
import { getSignedDocumentUrl } from '@/app/admin/applications/actions'
import { updateStudentRecord, updateStudentAvatar, removeStudentAvatar } from '@/app/admin/students/actions'
import { AvatarEditor } from '@/components/ui/avatar-editor'
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal'

type Guardian = {
  name: string
  relationship: string | null
  phone: string | null
  email: string | null
}

type DocRow = { document_type: string; file_url: string; verification_status: string }

type Student = {
  id: string
  student_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  enrollment_status: string
  avatar_url: string | null
  guardians: Guardian[]
  documents: DocRow[]
}

type Tab = 'personal' | 'guardian' | 'documents'

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

export function StudentRecordSlideover({ student, onClose }: { student: Student; onClose: () => void }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('personal')
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')

  const [avatarUrl, setAvatarUrl] = useState(student.avatar_url)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  async function handleAvatarSelected(file: File) {
    setIsSavingAvatar(true)
    setAvatarError('')
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const newUrl = await updateStudentAvatar(student.id, formData)
      setAvatarUrl(newUrl)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  async function handleAvatarRemove() {
    setIsSavingAvatar(true)
    setAvatarError('')
    try {
      await removeStudentAvatar(student.id)
      setAvatarUrl(null)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [firstName, setFirstName] = useState(student.first_name)
  const [middleName, setMiddleName] = useState(student.middle_name ?? '')
  const [lastName, setLastName] = useState(student.last_name)
  const [dob, setDob] = useState(student.date_of_birth)
  const [gender, setGender] = useState(student.gender)

  const fullName = `${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''} ${student.last_name}`

  async function handleViewDocument(path: string, label: string) {
    try {
      const url = await getSignedDocumentUrl(path)
      setPreviewTitle(label)
      setPreviewUrl(url)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not open that document.')
    }
  }

  async function handleSaveDetails() {
    setIsSaving(true)
    setSaveError('')
    try {
      await updateStudentRecord(student.id, {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        date_of_birth: dob,
        gender,
      })
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setFirstName(student.first_name)
    setMiddleName(student.middle_name ?? '')
    setLastName(student.last_name)
    setDob(student.date_of_birth)
    setGender(student.gender)
    setSaveError('')
    setIsEditing(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'personal', label: 'Personal Details' },
    { key: 'guardian', label: 'Guardian Info' },
    { key: 'documents', label: 'Documents' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div>
                <AvatarEditor
                  imageUrl={avatarUrl}
                  onFileSelected={handleAvatarSelected}
                  onRemove={avatarUrl ? handleAvatarRemove : undefined}
                  disabled={isSavingAvatar}
                  sizeClassName="h-16 w-16"
                />
                {avatarError && <p className="mt-1 max-w-[64px] text-center text-[10px] text-red-600">{avatarError}</p>}
              </div>
              <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{student.first_name} {student.last_name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${
                    student.enrollment_status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {student.enrollment_status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Student ID: {student.student_id ?? '—'}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-4 border-b border-gray-100">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                  tab === t.key ? 'border-[#e6007e] text-[#e6007e]' : 'border-transparent text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'personal' && !isEditing && (
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoField label="Legal Full Name" value={fullName} />
                <InfoField
                  label="Date of Birth (Age)"
                  value={`${formatDateLong(student.date_of_birth)} (${calculateAge(student.date_of_birth)}y)`}
                />
                <InfoField label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 rounded-lg border border-[#0b1b62] px-4 py-2 text-sm font-semibold text-[#0b1b62] hover:bg-[#0b1b62]/5"
              >
                Edit Personal Details
              </button>
            </div>
          )}

          {tab === 'personal' && isEditing && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Middle Name</label>
                  <input
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0b1b62]">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#0b1b62] focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {saveError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetails}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {tab === 'guardian' && (
            <div className="space-y-3">
              {student.guardians.length > 0 ? (
                student.guardians.map((g, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-4">
                    <p className="font-medium text-gray-900">
                      {g.name} {g.relationship && <span className="text-xs text-gray-500">({g.relationship})</span>}
                    </p>
                    {g.email && <p className="mt-1 text-sm text-gray-600">{g.email}</p>}
                    {g.phone && <p className="text-sm text-gray-600">{g.phone}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No linked guardian on file.</p>
              )}
            </div>
          )}

          {tab === 'documents' && (
            <div className="space-y-3">
              {documentOrder.map((type) => {
                const doc = student.documents.find((d) => d.document_type === type)
                return (
                  <div key={type} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{documentLabels[type]}</p>
                      <p className="text-xs capitalize text-gray-500">
                        {doc ? doc.verification_status.replace('_', ' ') : 'Not on file'}
                      </p>
                    </div>
                    {doc && (
                      <button
                        onClick={() => handleViewDocument(doc.file_url, documentLabels[type])}
                        className="text-sm font-medium text-[#0b1b62] underline"
                      >
                        View
                      </button>
                    )}
                  </div>
                )
              })}
              {errorMessage && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close Record
          </button>
        </div>
      </div>

      <DocumentPreviewModal
        url={previewUrl}
        title={previewTitle}
        onClose={() => setPreviewUrl(null)}
      />
    </div>
  )
}
