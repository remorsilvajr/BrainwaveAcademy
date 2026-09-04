import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { getPortalAuth } from '@/lib/get-portal-auth'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Brainwave Preschool Academy',
  description:
    'Answers to common questions about enrolling at Brainwave Preschool Academy — the application process, required documents, our programs, and what happens after you apply.',
}

// Answers only cover our own, already-built process (what the enrollment
// flow and parent portal actually do) — no fabricated tuition, hours, or
// response-time commitments the School hasn't actually made.
const faqs = [
  {
    question: 'How do I enroll my child at Brainwave Preschool Academy?',
    answer:
      "Start with our online enrollment form. You'll provide your child's basic information along with your own contact details as parent or guardian. Once submitted, our admissions team reviews the application — you'll receive an email with your parent portal login once it's approved, where you can then upload the required documents to complete enrollment.",
  },
  {
    question: 'What documents will I need to submit?',
    answer:
      "After your application is approved and you're logged into the parent portal, you'll upload your child's Birth Certificate, a 2x2 ID Photo, Proof of Address, and a valid ID for the enrolling parent or guardian. You can track the status of each document from the Requirements page in your portal.",
  },
  {
    question: 'What age groups and programs do you offer?',
    answer:
      "We offer four programs across early childhood: Little Explorers (ages 2-3), Advanced Toddler (ages 3-4), Smart Explorers (Nursery), and Curious Adventurers (Kindergarten). Every program is built around our 6 Domains of Development — see the Programs and 6 Domains sections on our home page for more detail.",
  },
  {
    question: 'Can I enroll more than one child?',
    answer:
      'Yes. Once you have a parent portal account, you can submit additional enrollment applications for other children directly from the "Enroll A Student" page in your portal — you won\'t need to fill out your own contact details again.',
  },
  {
    question: 'How will I know if my application was approved?',
    answer:
      "You'll receive an email once admin has reviewed your application — approved applicants get their parent portal login details by email, while any concerns are shared through the same channel. You can always check where things stand from the Enrollment Status page in your portal after logging in.",
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

export default async function FaqPage() {
  const auth = await getPortalAuth()

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SiteHeader auth={auth} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'FAQs' }]} />

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#e6007e]">
            Help Center
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#0b1b62] dark:text-indigo-300 sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-base leading-7 text-[#454650] dark:text-slate-300">
            Common questions about enrolling at Brainwave Preschool Academy. Have something
            else in mind?{' '}
            <Link href="/enroll" className="font-semibold text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
              Start an application
            </Link>{' '}
            or{' '}
            <Link href="/login" className="font-semibold text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
              log in
            </Link>{' '}
            to your portal.
          </p>

          <dl className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-[#c6c5d2] bg-white p-6 shadow-[0px_1px_2px_#0000000d] dark:border-slate-700 dark:bg-gray-900"
              >
                <dt className="text-lg font-semibold text-[#0b1b62] dark:text-indigo-300">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-[#454650] dark:text-slate-300 sm:text-base sm:leading-7">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 rounded-xl border border-[#c6c5d2] bg-[#fbf8ff] p-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-base font-semibold text-[#0b1b62] dark:text-indigo-300">
              Ready to apply?
            </p>
            <p className="mt-1 text-sm text-[#454650] dark:text-slate-300">
              Explore our{' '}
              <Link href="/#programs" className="underline hover:no-underline">
                programs
              </Link>{' '}
              and{' '}
              <Link href="/#domains" className="underline hover:no-underline">
                6 domains of development
              </Link>{' '}
              before you begin.
            </p>
            <Link
              href="/enroll"
              className="mt-4 inline-block rounded-full bg-[#e6007e] px-8 py-3 text-sm font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#c9006e]"
            >
              Start Enrollment
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
