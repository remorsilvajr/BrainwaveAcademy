import { SiteHeader } from '@/components/landing/site-header'
import { AcademyOverview } from '@/components/landing/academy-overview'
import { SiteFooter } from '@/components/landing/site-footer'
import { StickyMobileCta } from '@/components/landing/sticky-mobile-cta'
import { getPortalAuth } from '@/lib/get-portal-auth'

export default async function HomePage() {
  const auth = await getPortalAuth()

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900 pb-16 lg:pb-0">
      <SiteHeader auth={auth} />
      <AcademyOverview />
      <SiteFooter />
      {/* Logged-in visitors already have their own portal CTA in the header
          (Portal / Enroll A Student) — the sticky prompt is for a
          not-yet-applying, logged-out visitor specifically. */}
      {!auth && <StickyMobileCta />}
    </div>
  )
}
