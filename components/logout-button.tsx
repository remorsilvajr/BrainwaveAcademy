'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { iconMap, type IconName } from './sidebar'

export function LogoutButton({ icon }: { icon?: IconName }) {
  const router = useRouter()
  const Icon = icon ? iconMap[icon] : undefined

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#c7cff0] hover:bg-white/10 hover:text-white"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      Log Out
    </button>
  )
}
