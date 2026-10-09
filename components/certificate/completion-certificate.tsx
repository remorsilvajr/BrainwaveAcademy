'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'
import { formatDateLong } from '@/lib/format'
import { MAIN_BRANCH } from '@/lib/school-locations'

export type CertificateData = {
  studentName: string
  programName: string
  completedOn: string
}

// Only the certificate prints (landscape, no margins from the page around it), and
// it always prints in light colors whatever the screen theme is.
const PRINT_CSS = `@media print {
  @page { size: A4 landscape; margin: 0; }
  body * { visibility: hidden !important; }
  #completion-certificate, #completion-certificate * { visibility: visible !important; }
  #completion-certificate { position: fixed; inset: 0; margin: 0 !important; border-radius: 0 !important; background: #fff !important; color: #111 !important; }
}`

// A plain printable page like the receipts: "Print / Save as PDF" covers
// downloading it without a PDF library. The signature line is left blank on
// purpose, to be signed by hand.
export function CompletionCertificate({ data, backHref }: { data: CertificateData; backHref: string }) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="text-sm font-semibold text-[#00a3e0] hover:underline dark:text-sky-400">
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

      <div className="overflow-x-auto">
        <div
          id="completion-certificate"
          className="relative mx-auto aspect-[297/210] w-full min-w-[640px] rounded-2xl bg-white p-6 text-gray-900 shadow-sm"
        >
          <div className="flex h-full flex-col items-center justify-between border-[6px] border-double border-[#0b1b62] px-10 py-8 text-center">
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- printed page, a plain img prints reliably */}
              <img src="/images/landing/logo.svg" alt="" className="h-16 w-auto" />
              <p className="mt-2 text-xl font-bold tracking-wide text-[#0b1b62]">Brain Wave Academy</p>
              <p className="text-xs text-gray-500">{MAIN_BRANCH.address}</p>
            </div>

            <div>
              <p className="text-4xl font-bold tracking-wide text-[#0b1b62]">Certificate of Completion</p>
              <p className="mt-6 text-base text-gray-600">This certifies that</p>
              <p className="mt-2 border-b border-gray-300 px-10 pb-1 text-3xl font-semibold text-[#e6007e]">{data.studentName}</p>
              <p className="mt-4 text-base text-gray-600">
                has successfully completed the <span className="font-semibold text-gray-900">{data.programName}</span> program of
                Brain Wave Academy.
              </p>
              <p className="mt-2 text-sm text-gray-500">Given on {formatDateLong(data.completedOn)}.</p>
            </div>

            <div className="flex w-full justify-end">
              <div className="w-64 text-center">
                <div className="h-10 border-b border-gray-500" />
                <p className="mt-1 text-sm font-semibold text-gray-800">School Directress</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
