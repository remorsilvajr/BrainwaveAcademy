'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2, Plus, ShieldAlert } from 'lucide-react'
import { addDoNotRelease, removeDoNotRelease } from '@/app/admin/do-not-release/actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select'
import { formatDateShort } from '@/lib/format'

export type DnrRow = {
  id: string
  firstName: string
  lastName: string
  note: string | null
  createdAt: string
  studentName: string
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400'

function AddModal({ studentOptions, onClose }: { studentOptions: SearchableOption[]; onClose: () => void }) {
  const router = useRouter()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setError('')
    if (!studentId) return setError('Choose the child this applies to.')
    setIsSaving(true)
    try {
      const result = await addDoNotRelease({ studentId, firstName, lastName, note })
      if (result?.error) return setError(result.error)
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal onClose={isSaving ? () => {} : onClose} maxWidth="lg">
      <div className="border-b border-gray-100 p-6 dark:border-gray-800">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <Ban className="h-5 w-5 text-red-600" />
          Add to the do-not-release list
        </h2>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Child <span className="text-red-500">*</span></label>
          <SearchableSelect options={studentOptions} value={studentId} onChange={setStudentId} placeholder="Search for a student" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="dnr-first" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">First name <span className="text-red-500">*</span></label>
            <input id="dnr-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="dnr-last" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Last name <span className="text-red-500">*</span></label>
            <input id="dnr-last" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="dnr-note" className="mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">Reason or instruction</label>
          <textarea id="dnr-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: court order, call the office and the mother before any release." className={inputClass} />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      </div>
      <div className="flex gap-3 border-t border-gray-100 p-6 dark:border-gray-800">
        <button onClick={onClose} disabled={isSaving} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
          Cancel
        </button>
        <button onClick={handleSave} disabled={isSaving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Add to list
        </button>
      </div>
    </Modal>
  )
}

export function DoNotReleaseManager({ entries, studentOptions }: { entries: DnrRow[]; studentOptions: SearchableOption[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<DnrRow | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState('')

  async function handleRemove() {
    if (!removing) return
    setIsRemoving(true)
    setError('')
    try {
      const result = await removeDoNotRelease(removing.id)
      if (result?.error) setError(result.error)
      else router.refresh()
      setRemoving(null)
    } catch {
      setError('Something went wrong. Please try again.')
      setRemoving(null)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
          <Plus className="h-4 w-4" />
          Add a person
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}

      {entries.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nobody on the list" description="Add a person who must never be handed a child. They will be flagged in Pickup Verification." />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <div>
                <p className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300">
                  <Ban className="h-4 w-4" />
                  {e.firstName} {e.lastName}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Must not be given <span className="font-medium">{e.studentName}</span></p>
                {e.note && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{e.note}</p>}
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Added {formatDateShort(e.createdAt)}</p>
              </div>
              <button onClick={() => setRemoving(e)} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && <AddModal studentOptions={studentOptions} onClose={() => setAdding(false)} />}
      {removing && (
        <ConfirmDialog
          title="Remove from the list?"
          description={`${removing.firstName} ${removing.lastName} will no longer be flagged for ${removing.studentName}.`}
          confirmLabel="Yes, Remove"
          tone="danger"
          isPending={isRemoving}
          onConfirm={handleRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </>
  )
}
