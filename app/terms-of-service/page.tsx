import type { Metadata } from 'next'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { getPortalAuth } from '@/lib/get-portal-auth'

export const metadata: Metadata = {
  title: 'Terms of Service | Brainwave Preschool Academy',
  description:
    'The terms that govern use of the Brainwave Preschool Academy website, enrollment form, and portal.',
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

export default async function TermsOfServicePage() {
  const auth = await getPortalAuth()

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader auth={auth} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#e6007e]">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#0b1b62] dark:text-indigo-300 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-[#454650] dark:text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>

          <P>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
            Brainwave Preschool Academy website, public enrollment form, and the parent, teacher,
            and administrator portal (together, the &quot;Service&quot;), operated by Brainwave
            Preschool Academy (&quot;Brainwave,&quot; &quot;the School,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;), located in Tagum City, Davao del Norte,
            Philippines. By submitting the enrollment form, logging into the portal, or otherwise
            using the Service, you agree to be bound by these Terms. If you do not agree, please
            do not use the Service. See also our{' '}
            <a href="/privacy-policy" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">
              Privacy Policy
            </a>, which describes how we handle the personal information collected through the
            Service and is incorporated into these Terms by reference.
          </P>

          <H2 id="eligibility">1. Who may use the Service</H2>
          <P>
            The public enrollment form is intended to be submitted by a parent or legal guardian on
            behalf of a prospective student, or by an existing account holder. You must be at least
            18 years old, or the legal guardian of the student being enrolled, to submit an
            enrollment application or hold a parent account. Teacher and administrator accounts are
            issued directly by the School to its own staff and are for authorized School business
            only.
          </P>

          <H2 id="accounts">2. Accounts and account security</H2>
          <Ul>
            <li>
              Parent accounts are created by the School after an enrollment application is
              approved; teacher and admin accounts are created directly by an administrator. There
              is no public self-registration.
            </li>
            <li>You are responsible for keeping your login credentials confidential and for all activity that occurs under your account.</li>
            <li>Notify the School immediately if you suspect unauthorized access to your account.</li>
            <li>
              We may suspend (&quot;block&quot;) or terminate an account that violates these Terms,
              is used to submit fraudulent information, or otherwise poses a risk to the Service or
              to other users, at our reasonable discretion and, where practicable, with notice.
            </li>
          </Ul>

          <H2 id="accurate-info">3. Accuracy of submitted information</H2>
          <P>
            When you submit the enrollment form, upload a document, or edit a profile, you confirm
            that the information provided is true, accurate, and complete to the best of your
            knowledge, and that any document you upload (birth certificate, ID, proof of address,
            etc.) is genuine and belongs to the person named. Knowingly submitting false
            information or a fraudulent document may result in the rejection of an application, the
            suspension of an account, and, where applicable, referral to the appropriate
            authorities.
          </P>

          <H2 id="admissions">4. No guarantee of admission</H2>
          <P>
            Submitting the enrollment form is a request for admission, not a guarantee of a slot.
            Admission is subject to the School&apos;s review of the application and required
            documents, available capacity, and the School&apos;s own admission policies. The School
            may approve, reject, or request corrections to any application at its discretion, and
            will communicate the outcome to the parent/guardian email on file.
          </P>

          <H2 id="acceptable-use">5. Acceptable use</H2>
          <P>You agree not to:</P>
          <Ul>
            <li>Access or attempt to access another user&apos;s account, or any part of the Service you are not authorized to use for your role.</li>
            <li>Attempt to probe, scan, or test the vulnerability of the Service, or circumvent any of its security or authentication measures, except as part of an engagement the School has explicitly authorized.</li>
            <li>Upload any file that is malicious, unlawful, or that you do not have the right to submit.</li>
            <li>Use the Service to harass, defame, or misrepresent any other person.</li>
            <li>Use any automated system (bot, scraper, etc.) to access the Service outside of normal, individual, human use.</li>
            <li>Interfere with or disrupt the Service or the servers/networks connected to it.</li>
          </Ul>

          <H2 id="fees">6. Fees and payments</H2>
          <P>
            As of the &quot;Last updated&quot; date above, the Service does not process online
            tuition or fee payments — any tuition, fees, or other charges associated with
            enrollment are handled directly with the School office, outside of this Service. If
            online payment is introduced in the future, these Terms will be updated to describe the
            applicable payment terms before that feature becomes available.
          </P>

          <H2 id="ip">7. Intellectual property</H2>
          <P>
            The Service, including its design, text, graphics, logos, and underlying software, is
            owned by or licensed to the School and is protected by applicable intellectual property
            laws. You may not copy, modify, distribute, or create derivative works from the
            Service, except as necessary for your own personal, non-commercial use of it (e.g.
            printing a copy of your own child&apos;s records for your own reference). You retain
            ownership of the documents and photos you upload; by uploading them you grant the
            School a limited license to store and use them solely for the enrollment and
            record-keeping purposes described in the Privacy Policy.
          </P>

          <H2 id="disclaimer">8. Disclaimer of warranties</H2>
          <P>
            The Service is provided &quot;as is&quot; and &quot;as available,&quot; without
            warranties of any kind, whether express or implied, including but not limited to
            implied warranties of merchantability, fitness for a particular purpose, and
            non-infringement. We do not warrant that the Service will be uninterrupted, error-free,
            or completely secure, though we take reasonable measures to keep it available and
            secure as described in our Privacy Policy.
          </P>

          <H2 id="liability">9. Limitation of liability</H2>
          <P>
            To the fullest extent permitted by applicable law, the School shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages, or any loss of
            data, arising out of or related to your use of, or inability to use, the Service. This
            limitation does not apply to liability that cannot be excluded or limited under
            Philippine law, including liability arising from the School&apos;s own gross negligence
            or willful misconduct, or under the Data Privacy Act.
          </P>

          <H2 id="indemnity">10. Indemnification</H2>
          <P>
            You agree to indemnify and hold the School harmless from any claim, loss, or damage,
            including reasonable legal fees, arising from your breach of these Terms, your misuse
            of the Service, or your violation of any law or the rights of a third party.
          </P>

          <H2 id="termination">11. Termination</H2>
          <P>
            We may suspend or terminate your access to the Service at any time, with or without
            cause, including for a violation of these Terms. You may stop using the Service, and
            request closure of your account, at any time by contacting the School office. Sections
            of these Terms that by their nature should survive termination (including Sections 7
            through 10) will continue to apply.
          </P>

          <H2 id="governing-law">12. Governing law and disputes</H2>
          <P>
            These Terms are governed by the laws of the Republic of the Philippines, without regard
            to its conflict-of-laws principles. Any dispute arising from these Terms or the Service
            shall first be addressed informally by contacting the School office; if it cannot be
            resolved informally, it shall be subject to the exclusive jurisdiction of the proper
            courts of Tagum City, Davao del Norte, Philippines.
          </P>

          <H2 id="changes">13. Changes to these Terms</H2>
          <P>
            We may update these Terms from time to time, for example to reflect a new feature. We
            will update the &quot;Last updated&quot; date above when we do, and material changes
            will be highlighted on this page. Continuing to use the Service after a change takes
            effect constitutes acceptance of the updated Terms.
          </P>

          <H2 id="contact">14. Contact us</H2>
          <P>Questions about these Terms can be directed to the School office:</P>
          <Ul>
            <li>Brainwave Preschool Academy, Tagum City, Davao del Norte, Philippines</li>
            <li>Email: <a href="mailto:privacy@brainwaveacademy.edu.ph" className="text-[#0b1b62] underline hover:no-underline dark:text-indigo-300">privacy@brainwaveacademy.edu.ph</a></li>
          </Ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
