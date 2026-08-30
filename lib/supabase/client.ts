import { createBrowserClient } from '@supabase/ssr'
 
// IMPORTANT: this file runs in the browser, so NEXT_PUBLIC_ variables must
// be referenced directly and literally (process.env.NEXT_PUBLIC_X) rather
// than through a helper like requireEnv(name) that does process.env[name].
// Next.js only inlines the real value into the browser bundle when it can
// statically see the exact variable name in the source — a dynamic/variable
// lookup defeats that, and the value ends up undefined at runtime in the
// browser even though the same variable works fine server-side.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'These must be set at build time and referenced directly (not via a dynamic helper) since this file runs in the browser.'
  )
}
 
// Use this inside Client Components (files starting with 'use client').
// Example: const supabase = createClient()
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
}