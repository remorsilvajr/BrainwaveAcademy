'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'
import { formatCurrency, formatDateLong } from '@/lib/format'

export type ReceiptData = {
  receiptRef: string | null
  transactionDate: string | null
  paymentMethod: string | null
  description: string | null
  amount: number
  studentName: string
  studentAccountId: string | null
  parentName: string | null
  classroomName: string | null
}

const methodLabels: Record<string, string> = {
  wallet: 'Wallet',
  cash: 'Cash',
  check: 'Check',
}

// Deliberately a plain printable page, not a generated PDF file — the
// browser's own "Print > Save as PDF" covers "view/download/print" without
// adding a PDF-generation dependency to the project. See the Payments &
// wallet note in CLAUDE.md.
export function ReceiptView({ data, backHref }: { data: ReceiptData; backHref: string }) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="text-sm font-semibold text-[#00a3e0] dark:text-sky-400 hover:underline">
          ← Back
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-[#0b1b62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08154d]"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 print:border-0 print:shadow-none">
        <div className="border-b border-dashed border-gray-200 dark:border-gray-700 pb-4 text-center">
          <p className="text-lg font-bold text-[#0b1b62] dark:text-indigo-300">Brainwave Preschool Academy</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Official Payment Receipt</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Receipt No.</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{data.receiptRef ?? '-'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">Date</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {data.transactionDate ? formatDateLong(data.transactionDate) : '-'}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Student</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {data.studentName} {data.studentAccountId ? `(${data.studentAccountId})` : ''}
            </span>
          </div>
          {data.classroomName && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Classroom</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.classroomName}</span>
            </div>
          )}
          {data.parentName && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Parent/Guardian</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.parentName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Description</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{data.description ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {data.paymentMethod ? (methodLabels[data.paymentMethod] ?? data.paymentMethod) : '-'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-[#faf9fc] dark:bg-gray-800/60 p-4">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount Paid</span>
          <span className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">{formatCurrency(data.amount)}</span>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          This receipt was generated electronically and is valid without a signature.
        </p>
      </div>
    </div>
  )
}
