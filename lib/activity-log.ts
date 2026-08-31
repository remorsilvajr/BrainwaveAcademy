import type { SupabaseClient } from '@supabase/supabase-js'

// Best-effort audit trail write — a logging failure should never block the
// mutation it's describing, so callers fire-and-forget this rather than
// awaiting+throwing on its result. `actorId` is null for anonymous actions
// (e.g. the public enrollment form) since activity_log.actor_id is nullable.
export async function logActivity(
  supabase: SupabaseClient,
  input: { actorId: string | null; action: string; targetTable?: string; targetId?: string }
) {
  try {
    await supabase.from('activity_log').insert({
      actor_id: input.actorId,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
    })
  } catch {
    // Swallowed on purpose — see above.
  }
}
