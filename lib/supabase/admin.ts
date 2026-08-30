import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'

// SECURITY: this client uses the service role key, which bypasses Row Level
// Security entirely. Never import this file into a Client Component, and
// never expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  // DEBUG: temporary — checking why SUPABASE_SERVICE_ROLE_KEY isn't reaching this process. Remove once resolved.
  console.log('[DEBUG admin.ts] SUPABASE_SERVICE_ROLE_KEY defined:', !!process.env.SUPABASE_SERVICE_ROLE_KEY, 'length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0)
  return createSupabaseClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
