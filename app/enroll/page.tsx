import Link from 'next/link'
import { SiteHeader } from '@/components/landing/site-header'
import { EnrollmentForm } from '@/components/enroll/enrollment-form'

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const { submitted } = await searchParams

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Enrollment Application</h1>
            <p className="mt-3 text-base text-[#454650] dark:text-slate-300">
              Complete the form below to apply for admission. Once submitted, our
              administration team will review your application and issue portal login
              credentials via email.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-xl border border-[#c6c5d2] dark:border-slate-700 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
              <h2 className="text-2xl font-semibold text-[#0b1b62] dark:text-indigo-300">Application Submitted!</h2>
              <p className="mt-2 text-base text-[#454650] dark:text-slate-300">
                Thank you for applying. Our admissions team will review your application and
                email your login details once it&apos;s approved.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-full bg-[#0b1b62] px-6 py-3 text-sm font-semibold text-white hover:bg-[#08154d]"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <EnrollmentForm />
          )}
        </div>
      </main>
    </div>
  )
}
