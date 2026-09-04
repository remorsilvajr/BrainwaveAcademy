import type { Metadata } from 'next'
import { SiteHeader } from '@/components/landing/site-header'
import { EnrollmentForm } from '@/components/enroll/enrollment-form'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export const metadata: Metadata = {
  title: 'Enroll a Student | Brainwave Preschool Academy',
  description:
    'Apply for admission to Brainwave Preschool Academy. Submit your child and parent/guardian details online — our admissions team will review your application and email portal login details once approved.',
}

export default function EnrollPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Enroll' }]} />

          <div className="mb-8 mt-6 text-center">
            <h1 className="text-4xl font-bold text-[#0b1b62] dark:text-indigo-300">Student Enrollment Application</h1>
            <p className="mt-3 text-base text-[#454650] dark:text-slate-300">
              Complete the form below to apply for admission. Once submitted, our
              administration team will review your application and issue portal login
              credentials via email.
            </p>
          </div>

          <EnrollmentForm />
        </div>
      </main>
    </div>
  )
}
