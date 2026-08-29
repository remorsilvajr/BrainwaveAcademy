'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent('Incorrect email or password.')}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  // Blocked/inactive accounts shouldn't reach a dashboard
  const { data: statusCheck } = await supabase
    .from('profiles')
    .select('account_status')
    .eq('id', data.user.id)
    .single()

  if (statusCheck?.account_status === 'blocked') {
    await supabase.auth.signOut()
    redirect(`/login?error=${encodeURIComponent('This account has been blocked. Contact the school.')}`)
  }

  redirect(`/${profile?.role ?? 'parent'}`)
}
