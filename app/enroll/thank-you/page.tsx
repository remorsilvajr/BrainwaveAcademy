import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { getPortalAuth } from '@/lib/get-portal-auth'

// A confirmation page like this has no reason to rank in search — noindex so
// it never turns up as a landing result for someone who hasn't applied yet.
export const metadata: Metadata = {
  title: 'Application Submitted | Brainwave Preschool Academy',
  description: 'Your enrollment application has been submitted for review.',
  robots: { index: false, follow: true },
}

export default async function EnrollThankYouPage() {
  const auth = await getPortalAuth()

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader auth={auth} />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Breadcrumbs
            items={[{ label: 'Home', href: '/' }, { label: 'Enroll', href: '/enroll' }, { label: 'Application Submitted' }]}
          />

          <div className="mt-6 rounded-xl border border-[#c6c5d2] bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-gray-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#76c8281a] text-3xl">
              ✓
            </div>
            <h1 className="mt-4 text-3xl font-bold text-[#0b1b62] dark:text-indigo-300">
              Application Submitted!
            </h1>
            <p className="mt-3 text-base leading-7 text-[#454650] dark:text-slate-300">
              Thank you for applying to Brainwave Preschool Academy. Our admissions team will
              review your application, and we&apos;ll email your parent portal login details
              once it&apos;s approved.
            </p>

            <div className="mt-6 rounded-lg bg-[#fbf8ff] p-5 text-left dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">
                What happens next?
              </h2>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-[#454650] dark:text-slate-300">
                <li>Our admissions team reviews your application.</li>
                <li>You&apos;ll receive an email with your parent portal login once approved.</li>
                <li>Log in and upload the required enrollment documents from your Requirements page.</li>
                <li>Admin reviews your documents to finish enrolling your child.</li>
              </ol>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/"
                className="rounded-full bg-[#0b1b62] px-6 py-3 text-sm font-semibold text-white hover:bg-[#08154d]"
              >
                Back to Home
              </Link>
              <Link
                href="/faq"
                className="rounded-full border-2 border-[#0b1b62] px-6 py-3 text-sm font-semibold text-[#0b1b62] hover:bg-[#0b1b620d] dark:border-indigo-300 dark:text-indigo-300 dark:hover:bg-white/5"
              >
                Read FAQs
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
