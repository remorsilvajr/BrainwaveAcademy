import { SiteHeader } from '@/components/landing/site-header'
import { AcademyOverview } from '@/components/landing/academy-overview'
import { SiteFooter } from '@/components/landing/site-footer'

export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader />
      <AcademyOverview />
      <SiteFooter />
    </div>
  )
}
