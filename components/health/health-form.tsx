'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react'
import { saveHealthInfo } from '@/components/health/actions'
import { PlainSelect } from '@/components/ui/plain-select'
import { PICKUP_RELATIONSHIPS } from '@/lib/pickup-relationships'
import { HEALTH_TEXT_MAX, MAX_EMERGENCY_CONTACTS, validateHealthInput, type HealthInput } from '@/lib/health'

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100 dark:focus:border-indigo-400'
const labelClass = 'mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300'

// Health and emergency details for one child. Used by the parent's Health &
// Emergency page and the admin's Student Record; the save action re-validates
// everything and RLS decides who may write.
export function HealthForm({
  studentId,
  initial,
  onSaved,
}: {
  studentId: string
  initial: HealthInput
  onSaved?: () => void
}) {
  const router = useRouter()
  const [value, setValue] = useState<HealthInput>(initial)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof HealthInput>(key: K, next: HealthInput[K]) {
    setValue((current) => ({ ...current, [key]: next }))
    setSaved(false)
  }
  function setContact(index: number, key: 'fullName' | 'relationship' | 'phoneNumber', next: string) {
    setValue((current) => ({
      ...current,
      contacts: current.contacts.map((c, i) => (i === index ? { ...c, [key]: next } : c)),
    }))
    setSaved(false)
  }

  async function handleSave() {
    setError('')
    const checked = validateHealthInput(value)
    if ('error' in checked) {
      setError(checked.error)
      return
    }
    setIsSaving(true)
    try {
      const result = await saveHealthInfo(studentId, value)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
      onSaved?.()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const textArea = (id: string, label: string, key: 'allergies' | 'medicalConditions' | 'medications' | 'notes', placeholder: string) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        rows={2}
        maxLength={HEALTH_TEXT_MAX}
        value={value[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {textArea('h-allergies', 'Allergies', 'allergies', 'Food, medicine, insect stings. Leave blank if none.')}
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/50 dark:bg-red-950/20">
          <input
            type="checkbox"
            checked={value.severeAllergy}
            onChange={(e) => set('severeAllergy', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-600"
          />
          <span>
            <span className="font-semibold text-red-700 dark:text-red-300">This is a severe allergy</span>
            <span className="block text-xs text-red-600/80 dark:text-red-300/80">
              Teachers see a red alert beside your child&apos;s name on the attendance list.
            </span>
          </span>
        </label>
        {textArea('h-conditions', 'Medical conditions', 'medicalConditions', 'For example asthma, epilepsy, a heart condition.')}
        {textArea('h-meds', 'Medications', 'medications', 'Name, dose and when it is taken.')}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="h-doctor" className={labelClass}>Doctor</label>
          <input id="h-doctor" value={value.doctorName} maxLength={100} onChange={(e) => set('doctorName', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="h-doctor-phone" className={labelClass}>Doctor&apos;s phone</label>
          <input id="h-doctor-phone" type="tel" inputMode="tel" maxLength={20} value={value.doctorPhone} onChange={(e) => set('doctorPhone', e.target.value)} placeholder="0917 123 4567" className={inputClass} />
        </div>
        <div>
          <label htmlFor="h-hospital" className={labelClass}>Preferred hospital</label>
          <input id="h-hospital" value={value.preferredHospital} maxLength={150} onChange={(e) => set('preferredHospital', e.target.value)} className={inputClass} />
        </div>
      </div>

      {textArea('h-notes', 'Anything else the school should know', 'notes', 'Dietary needs, fears, routines that help.')}

      <div>
        <p className="mb-2 text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
          Emergency contacts <span className="font-normal text-gray-400">(up to {MAX_EMERGENCY_CONTACTS}, other than you)</span>
        </p>
        <div className="space-y-3">
          {value.contacts.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-[1fr_11rem_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Full name</label>
                <input value={c.fullName} onChange={(e) => setContact(i, 'fullName', e.target.value)} className={inputClass} />
              </div>
              <PlainSelect
                label="Relationship"
                value={c.relationship}
                onChange={(next) => setContact(i, 'relationship', next)}
                options={PICKUP_RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
                placeholder="Select"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <input type="tel" inputMode="tel" maxLength={20} value={c.phoneNumber} onChange={(e) => setContact(i, 'phoneNumber', e.target.value)} placeholder="0917 123 4567" className={inputClass} />
              </div>
              <button
                type="button"
                onClick={() => setValue((current) => ({ ...current, contacts: current.contacts.filter((_, j) => j !== i) }))}
                aria-label={`Remove contact ${i + 1}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {value.contacts.length < MAX_EMERGENCY_CONTACTS && (
          <button
            type="button"
            onClick={() => setValue((current) => ({ ...current, contacts: [...current.contacts, { fullName: '', relationship: '', phoneNumber: '' }] }))}
            className="mt-2 flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add a contact
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      {saved && !error && (
        <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Saved.
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-2 rounded-lg bg-[#0b1b62] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#08154d] disabled:opacity-60"
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSaving ? 'Saving…' : 'Save health information'}
      </button>
    </div>
  )
}
