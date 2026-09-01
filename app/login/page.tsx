import { SiteHeader } from '@/components/landing/site-header'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-white to-slate-50 dark:from-gray-950 dark:to-gray-900">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <LoginForm error={error} />
      </main>
    </div>
  )
}
