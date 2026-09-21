import { Sidebar, type NavSection } from '@/components/sidebar'
import { CashierTopBar } from '@/components/cashier/cashier-topbar'
import { createClient } from '@/lib/supabase/server'

// The cashier portal: Payments (all five tabs, minus the admin-only corrections) and the
// account's own Settings. Nothing else in the school's data is reachable from here.
const sections: NavSection[] = [
  {
    items: [{ label: 'Payments', href: '/cashier/payments', icon: 'wallet' }],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', href: '/cashier/settings', icon: 'settings' },
      { label: 'Log Out', isLogout: true, icon: 'logout' },
    ],
  },
]

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  return (
    <div className="flex">
      <Sidebar sections={sections} schoolName="Brainwave Academy" portalLabel="Cashier Portal" />
      <div className="min-w-0 flex-1 pt-14 lg:ml-72 lg:pt-0">
        <CashierTopBar
          sections={sections}
          cashier={{
            first_name: profile?.first_name ?? '',
            last_name: profile?.last_name ?? '',
            avatar_url: profile?.avatar_url ?? null,
          }}
        />
        <main className="bg-[#faf9fc] dark:bg-gray-950 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  )
}
