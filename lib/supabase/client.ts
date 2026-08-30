import { createBrowserClient } from '@supabase/ssr'
import { requireEnv } from '@/lib/env'

// Use this inside Client Components (files starting with 'use client').
// Example: const supabase = createClient()
export function createClient() {
  return createBrowserClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )
}
