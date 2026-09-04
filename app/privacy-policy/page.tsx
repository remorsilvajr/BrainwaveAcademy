import type { Metadata } from 'next'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { getPortalAuth } from '@/lib/get-portal-auth'

export const metadata: Metadata = {
  title: 'Privacy Policy | Brainwave Preschool Academy',
  description:
    'How Brainwave Preschool Academy collects, uses, stores, and protects personal information submitted through this site and portal.',
}

const LAST_UPDATED = 'September 3, 2026'

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-10 scroll-mt-24 text-xl font-bold text-[#0b1b62] dark:text-indigo-300 sm:text-2xl"
    >
      {children}
    </h2>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-[#454650] dark:text-slate-300 sm:text-base sm:leading-7">{children}</p>
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#454650] dark:text-slate-300 sm:text-base sm:leading-7">
      {children}
    </ul>
  )
}

export default async function PrivacyPolicyPage() {
  const auth = await getPortalAuth()

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader auth={auth} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#e6007e]">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#0b1b62] dark:text-indigo-300 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-[#454650] dark:text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>

          <P>
            Brainwave Preschool Academy (&quot;Brainwave,&quot; &quot;the School,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) operates this website and the enrollment/admin
            portal reachable from it (together, the &quot;Service&quot;). This Privacy Policy
            explains what personal information we collect from applicants, parents/guardians,
            students, teachers, and staff; why we collect it; how it is stored and protected; who
            it may be shared with; and the rights you have over it. It is written to comply with
            the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the
            Philippines and its Implementing Rules and Regulations, as administered by the{' '}
            <strong>National Privacy Commission (NPC)</strong>.
          </P>
          <P>
            By submitting the enrollment form, logging into the portal, or otherwise using the
            Service, you acknowledge that you have read and understood this Policy. If you are
            submitting information on behalf of a child (as a parent or legal guardian), you
            confirm that you are legally authorized to consent to the processing of that child&apos;s
            personal information on their behalf.
          </P>

          <nav aria-label="Table of contents" className="mt-8 rounded-2xl border border-[#c6c5d2] bg-[#fbf8ff] p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-semibold text-[#0b1b62] dark:text-indigo-300">On this page</p>
            <ul className="mt-2 list-none space-y-1 p-0 text-sm">
              {[
                ['who-we-are', '1. Who we are'],
                ['information-we-collect', '2. Information we collect'],
                ['how-we-use-it', '3. How we use your information'],
                ['legal-basis', '4. Our legal basis for processing'],
                ['sharing', '5. Who we share information with'],
                ['storage-security', '6. How we store and protect your information'],
                ['retention', '7. How long we keep your information'],
                ['childrens-data', "8. Children's data"],
                ['cookies', '9. Cookies and similar technologies'],
                ['your-rights', '10. Your rights under the Data Privacy Act'],
                ['breach', '11. Data breach notification'],
                ['changes', '12. Changes to this policy'],
                ['contact', '13. Contact us'],
              ].map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-[#454650] hover:text-[#0b1b62] hover:underline dark:text-slate-300 dark:hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <H2 id="who-we-are">1. Who we are</H2>
          <P>
            Brainwave Preschool Academy is a preschool located in Tagum City, Davao del Norte,
            Philippines. For the purposes of the Data Privacy Act, the School is the{' '}
            <strong>personal information controller</strong> for the data described in this
            Policy. This Service is a school capstone/administrative project built for the
            School&apos;s enrollment and day-to-day student-records administration — it is not a
            public commercial platform, and access to student and family records is restricted to
            authorized School personnel only.
          </P>

          <H2 id="information-we-collect">2. Information we collect</H2>
          <P>We collect the following categories of personal information:</P>
          <Ul>
            <li>
              <strong>Student information:</strong> first, middle, and last name; date of birth;
              gender; profile photo; attendance records; developmental milestone assessments and
              teacher notes; and enrollment/application status.
            </li>
            <li>
              <strong>Parent/guardian information:</strong> first, middle, and last name; date of
              birth; relationship to the student; contact number; email address; profile photo;
              and, once an account exists, login credentials (your password is never stored in
              readable form — see Section 6).
            </li>
            <li>
              <strong>Enrollment documents:</strong> when uploading enrollment requirements, we
              collect scans/photos of a birth certificate, a 2x2 ID photo, proof of address, and a
              guardian&apos;s valid government ID.
            </li>
            <li>
              <strong>Staff information:</strong> for teacher and admin accounts, first/middle/last
              name, date of birth, gender, contact details, profile photo, and role/permissions
              within the portal.
            </li>
            <li>
              <strong>Usage and account activity:</strong> login timestamps, an internal activity
              log of account and record changes (for audit purposes), and basic, aggregated,
              cookie-free page-analytics/performance metrics (see Section 9).
            </li>
          </Ul>

          <H2 id="how-we-use-it">3. How we use your information</H2>
          <Ul>
            <li>To process and review enrollment applications and admission decisions.</li>
            <li>To create and manage parent, teacher, and admin portal accounts.</li>
            <li>To record attendance and track developmental milestones for enrolled students.</li>
            <li>To communicate with parents/guardians — admission decisions, account credentials, requests to correct or resubmit a document, password resets, and school announcements.</li>
            <li>To verify identity and eligibility documents submitted as part of enrollment.</li>
            <li>To maintain an internal audit trail of who changed what record and when, for accountability and security.</li>
            <li>To keep the Service secure — detecting misuse, enforcing account status (e.g. blocking a compromised or misused account), and troubleshooting technical issues.</li>
          </Ul>
          <P>
            We do not sell personal information, and we do not use student or family data for
            advertising or marketing to third parties.
          </P>

          <H2 id="legal-basis">4. Our legal basis for processing</H2>
          <P>
            We process personal information on the basis of: (a) your{' '}
            <strong>consent</strong>, given when you submit the enrollment form or otherwise
            provide information through the Service; (b) our{' '}
            <strong>legitimate interest</strong> and contractual necessity in administering the
            enrollment, attendance, and educational records of a preschool you have applied to or
            enrolled a child with; and (c) compliance with applicable legal and regulatory
            obligations relating to the operation of a preschool in the Philippines.
          </P>

          <H2 id="sharing">5. Who we share information with</H2>
          <P>
            We do not sell or rent personal information. We share it only as follows:
          </P>
          <Ul>
            <li>
              <strong>Within the School:</strong> authorized teachers and administrators, strictly
              limited to what each role needs (e.g. teachers can record attendance/milestones for
              enrolled students but cannot access admin account-management functions).
            </li>
            <li>
              <strong>Service providers we rely on to operate the Service</strong> — each acting as
              a personal information processor on our behalf, under the same confidentiality
              expectations as this Policy:
              <ul className="mt-2 list-[circle] space-y-1 pl-5">
                <li><strong>Supabase</strong> — hosts our database, authentication, and private file storage.</li>
                <li><strong>Vercel</strong> — hosts the website/portal application itself, and provides privacy-respecting, cookie-free traffic analytics and performance monitoring.</li>
                <li><strong>Brevo</strong> and <strong>Postmark</strong> — send transactional emails on our behalf (account credentials, password resets, correction requests, announcements). We do not use either to send marketing email.</li>
              </ul>
            </li>
            <li>
              <strong>Legal requirements:</strong> if required to do so by law, court order, or a
              lawful request from the National Privacy Commission or another government authority.
            </li>
          </Ul>

          <H2 id="storage-security">6. How we store and protect your information</H2>
          <Ul>
            <li>All data is stored with Supabase, encrypted in transit (HTTPS/TLS) and at rest.</li>
            <li>
              Database access is governed by Row Level Security (RLS) — database-enforced rules
              that restrict each account to only the rows it is actually authorized to read or
              write (e.g. a parent account can only see their own linked children, never another
              family&apos;s records).
            </li>
            <li>Enrollment documents (birth certificates, IDs, proof of address) are stored in a private file bucket, never publicly accessible, and only readable via short-lived, signed links generated for an authorized reviewer.</li>
            <li>Passwords are hashed by our authentication provider and are never stored or visible in plain text to School staff, including administrators.</li>
            <li>Administrative actions that create, block, or delete an account or record are logged to an internal activity log for accountability.</li>
            <li>Access to the admin and teacher portals requires authentication, and each role only sees the sections and records relevant to it.</li>
          </Ul>
          <P>
            No method of transmission or storage is 100% secure. While we take reasonable,
            industry-standard measures to protect your information, we cannot guarantee absolute
            security.
          </P>

          <H2 id="retention">7. How long we keep your information</H2>
          <P>
            We keep enrollment applications, student records, and related documents for as long as
            reasonably necessary to fulfill the purposes described in this Policy, including for
            the duration of a student&apos;s enrollment and for a reasonable period afterward for
            legitimate record-keeping and legal purposes. A rejected or withdrawn application can
            be hidden from a parent&apos;s own portal view at their request, and a record can be
            removed from an admin&apos;s active views by an administrator — in both cases the
            underlying record is retained, not permanently erased, so that the School maintains an
            accurate enrollment history. You may request deletion of your personal information
            subject to Section 10 below and our legitimate record-keeping obligations.
          </P>

          <H2 id="childrens-data">8. Children&apos;s data</H2>
          <P>
            As a preschool, the majority of the personal information we process belongs to young
            children who cannot themselves provide legal consent. We only collect a student&apos;s
            information from, and with the consent of, their parent or legal guardian, who submits
            it directly through the enrollment form or the portal. We do not knowingly collect
            personal information directly from a child, and we do not enable public profiles,
            messaging, or any other feature that would expose a child&apos;s information to anyone
            outside authorized School staff and that child&apos;s own linked parent/guardian
            account.
          </P>

          <H2 id="cookies">9. Cookies and similar technologies</H2>
          <P>
            We use a small number of cookies, all of which are <strong>strictly necessary</strong>{' '}
            to operate the Service — none are used for advertising, and none are shared with
            advertising networks:
          </P>
          <Ul>
            <li><strong>Authentication cookies</strong> — keep you securely logged in to your portal session.</li>
            <li><strong>Preference cookies</strong> (<code>remember_me</code>, <code>theme</code>) — remember whether you asked to stay logged in, and your light/dark mode choice.</li>
            <li><strong>Security/role cookies</strong> (<code>user_role</code>, <code>account_status</code>, <code>presence_ping</code>) — short-lived, server-set cookies used to route you to the correct portal and to enforce account status (e.g. a blocked account) without a database check on every click.</li>
            <li><strong>Consent cookie</strong> (<code>cookie_consent</code>) — remembers that you have seen and dismissed our cookie notice.</li>
          </Ul>
          <P>
            Because these cookies are all strictly necessary for the Service to function (you
            cannot stay logged in without them), we do not offer an option to disable them
            individually — declining them means the Service will not work. We separately use
            Vercel Analytics and Speed Insights, which are designed to be cookie-free and do not
            track you individually across sites. See our cookie notice, shown on your first visit,
            for a short summary of this same information.
          </P>

          <H2 id="your-rights">10. Your rights under the Data Privacy Act</H2>
          <P>As a data subject under RA 10173, you have the right to:</P>
          <Ul>
            <li><strong>Be informed</strong> that your personal information will be, is being, or has been processed — which this Policy is intended to satisfy.</li>
            <li><strong>Access</strong> your own personal information held by us, or that of a child you are the parent/guardian of.</li>
            <li><strong>Object</strong> to the processing of your personal information, including for any new purpose not covered here.</li>
            <li><strong>Correct or rectify</strong> inaccurate or outdated personal information — most of your own account details can be updated directly from your Profile page; other corrections can be requested from the School office.</li>
            <li><strong>Erasure or blocking</strong> of your personal information, subject to our legitimate retention needs described in Section 7.</li>
            <li><strong>Data portability</strong> — request a copy of your data in an electronic format.</li>
            <li><strong>Be indemnified</strong> for damages sustained due to inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of your personal information.</li>
            <li><strong>Lodge a complaint</strong> with the National Privacy Commission (<a href="https://privacy.gov.ph" target="_blank" rel="noreferrer" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">privacy.gov.ph</a>) if you believe your rights under the Data Privacy Act have been violated.</li>
          </Ul>
          <P>To exercise any of these rights, contact us using the details in Section 13.</P>

          <H2 id="breach">11. Data breach notification</H2>
          <P>
            In the event of a personal data breach that is reasonably believed to give rise to a
            real risk of serious harm, we will notify the National Privacy Commission and the
            affected individuals within the timeframe required by the Data Privacy Act and its
            Implementing Rules and Regulations, and take reasonable steps to contain and remediate
            the breach.
          </P>

          <H2 id="changes">12. Changes to this policy</H2>
          <P>
            We may update this Privacy Policy from time to time, for example to reflect a new
            feature or a change in how we process information. We will update the &quot;Last
            updated&quot; date above when we do. Material changes will be highlighted on this page.
          </P>

          <H2 id="contact">13. Contact us</H2>
          <P>
            Questions, concerns, or requests regarding this Policy or your personal information can
            be directed to the School office:
          </P>
          <Ul>
            <li>Brainwave Preschool Academy, Tagum City, Davao del Norte, Philippines</li>
            <li>Email: <a href="mailto:rsilva1@addu.edu.ph" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">rsilva1@addu.edu.ph</a></li>
          </Ul>
          <p className="mt-2 text-xs italic text-[#454650] dark:text-slate-400">
            Note: this is a temporary contact address, used until the School has its own official
            email set up. Requests sent here are still monitored.
          </p>
          <P>
            See also our <a href="/terms-of-service" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">Terms of Service</a>.
          </P>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
