import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { getPortalAuth } from '@/lib/get-portal-auth'

export const metadata: Metadata = {
  title: 'Page Not Found | Brainwave Preschool Academy',
  description: 'The page you are looking for does not exist or may have moved.',
}

export default async function NotFound() {
  const auth = await getPortalAuth()

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader auth={auth} />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-lg text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#e6007e]">404 Error</p>
          <h1 className="mt-2 text-4xl font-extrabold text-[#0b1b62] dark:text-indigo-300 sm:text-5xl">
            Page Not Found
          </h1>
          <p className="mt-4 text-base leading-7 text-[#454650] dark:text-slate-300">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved. Here
            are a few places to get back on track.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="rounded-full bg-[#e6007e] px-8 py-3 text-sm font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#c9006e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62]"
            >
              Back to Home
            </Link>
            <Link
              href="/enroll"
              className="rounded-full border-2 border-[#0b1b62] px-8 py-3 text-sm font-semibold text-[#0b1b62] transition-colors hover:bg-[#0b1b620d] dark:border-indigo-300 dark:text-indigo-300 dark:hover:bg-white/5"
            >
              Enroll a Student
            </Link>
          </div>

          <nav aria-label="Helpful links" className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/#programs" className="font-semibold text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
              Our Programs
            </Link>
            <Link href="/faq" className="font-semibold text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
              FAQs
            </Link>
            <Link href="/login" className="font-semibold text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
              Log In
            </Link>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
