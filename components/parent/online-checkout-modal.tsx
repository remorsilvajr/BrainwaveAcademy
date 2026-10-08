'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, CreditCard, Loader2, Smartphone, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/format'
import { payOnline, type OnlinePaymentResult } from '@/app/parent/payments/actions'
import { SANDBOX_TEST_CARDS, SANDBOX_TEST_GCASH, type OnlineMethod } from '@/lib/sandbox-checkout'

const inputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0b1b62] focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100'
const labelClasses = 'mb-1 block text-sm font-semibold text-[#0b1b62] dark:text-indigo-300'

// "4111111111111111" -> "4111 1111 1111 1111" as it is typed.
const groupCard = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')

// The online checkout (a sandbox: no real money moves). Shows the published test
// numbers so anyone can try a payment that succeeds or one that is declined.
export function OnlineCheckoutModal({
  studentId,
  studentName,
  amount,
  onClose,
  onPaid,
}: {
  studentId: string
  studentName: string
  amount: number
  onClose: () => void
  onPaid: () => void
}) {
  const [method, setMethod] = useState<OnlineMethod>('card')
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState('')
  const [paid, setPaid] = useState<Extract<OnlinePaymentResult, { ok: true }> | null>(null)

  async function handlePay() {
    setError('')
    setIsPaying(true)
    try {
      const result = await payOnline(
        studentId,
        amount,
        method === 'card' ? { method, number, expiry, cvc, name } : { method, mobile }
      )
      if ('error' in result) {
        setError(result.error)
        return
      }
      setPaid(result)
    } catch {
      setError('Something went wrong. You were not charged. Please try again.')
    } finally {
      setIsPaying(false)
    }
  }

  function close() {
    if (paid) onPaid()
    onClose()
  }

  if (paid) {
    return (
      <Modal onClose={close} maxWidth="md">
        <div className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 dark:text-green-400" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Paid successfully</h2>
          <p className="mt-2 text-3xl font-bold text-[#0b1b62] dark:text-indigo-300">{formatCurrency(paid.amount)}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Paid for {studentName} with {paid.methodNote}. A receipt was sent to your email unless you turned emails off.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {paid.receipts.map((r, i) => (
              <Link
                key={r.transactionId}
                href={`/parent/payments/${r.paymentId}/receipt?tx=${r.transactionId}`}
                className="rounded-full border border-[#0b1b62] px-4 py-1.5 text-xs font-semibold text-[#0b1b62] hover:bg-[#0b1b62] hover:text-white dark:border-indigo-300 dark:text-indigo-300"
              >
                View Receipt{paid.receipts.length > 1 ? ` ${i + 1}` : ''}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={close}
            className="mt-6 w-full rounded-lg bg-[#0b1b62] py-2.5 text-sm font-semibold text-white hover:bg-[#08154d]"
          >
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={isPaying ? () => {} : onClose} maxWidth="md">
      <div className="flex items-start justify-between border-b border-gray-100 p-6 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pay Online</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {formatCurrency(amount)} for {studentName}
          </p>
        </div>
        <button onClick={onClose} disabled={isPaying} aria-label="Close" className="-m-2 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40 dark:text-gray-500">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 p-6">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-semibold">Test mode:</span> this checkout is a sandbox and no real money is charged. Use one of the test
          numbers below (tap one to fill it in).
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: 'card', label: 'Card', icon: CreditCard },
              { key: 'gcash', label: 'GCash', icon: Smartphone },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMethod(key)
                setError('')
              }}
              disabled={isPaying}
              aria-pressed={method === key}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                method === key
                  ? 'border-[#0b1b62] bg-[#0b1b62]/5 text-[#0b1b62] dark:border-indigo-400 dark:bg-indigo-400/10 dark:text-indigo-300'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {method === 'card' ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="card-name" className={labelClasses}>Name on Card</label>
              <input id="card-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={inputClasses} />
            </div>
            <div>
              <label htmlFor="card-number" className={labelClasses}>Card Number</label>
              <input
                id="card-number"
                inputMode="numeric"
                autoComplete="off"
                value={number}
                onChange={(e) => setNumber(groupCard(e.target.value))}
                placeholder="4111 1111 1111 1111"
                className={inputClasses}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="card-expiry" className={labelClasses}>Expiry (MM/YY)</label>
                <input
                  id="card-expiry"
                  inputMode="numeric"
                  autoComplete="off"
                  value={expiry}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                  }}
                  placeholder="12/30"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="card-cvc" className={labelClasses}>Security Code</label>
                <input
                  id="card-cvc"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  className={inputClasses}
                />
              </div>
            </div>
            <TestNumbers
              items={SANDBOX_TEST_CARDS.map((c) => ({ value: c.number, display: groupCard(c.number), outcome: c.outcome, ok: !c.error }))}
              onPick={(value) => {
                setNumber(groupCard(value))
                if (!expiry) setExpiry('12/30')
                if (!cvc) setCvc('123')
                setError('')
              }}
              note="Any future expiry date and any 3-digit code work with these."
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="gcash-mobile" className={labelClasses}>GCash Mobile Number</label>
              <input
                id="gcash-mobile"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="0966 164 5400"
                className={inputClasses}
              />
            </div>
            <TestNumbers
              items={SANDBOX_TEST_GCASH.map((g) => ({ value: g.number, display: g.number, outcome: g.outcome, ok: !g.error }))}
              onPick={(value) => {
                setMobile(value)
                setError('')
              }}
            />
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      </div>

      <div className="flex gap-3 border-t border-gray-100 p-6 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          disabled={isPaying}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={isPaying}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#e6007e] py-2.5 text-sm font-semibold text-white hover:bg-[#c9006e] disabled:opacity-60"
        >
          {isPaying && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPaying ? 'Processing…' : `Pay ${formatCurrency(amount)}`}
        </button>
      </div>
    </Modal>
  )
}

function TestNumbers({
  items,
  onPick,
  note,
}: {
  items: { value: string; display: string; outcome: string; ok: boolean }[]
  onPick: (value: string) => void
  note?: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-600">
      <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Test numbers</p>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onPick(item.value)}
            className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="font-mono text-gray-800 dark:text-gray-200">{item.display}</span>
            <span className={item.ok ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>{item.outcome}</span>
          </button>
        ))}
      </div>
      {note && <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{note}</p>}
    </div>
  )
}
