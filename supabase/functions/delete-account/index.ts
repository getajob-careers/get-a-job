import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Self-service account deletion.
//
// Flow:
//   1. Validate JWT. Only allow the authenticated user to delete THEIR own
//      account — no admin/elevated path through this function.
//   2. Best-effort wipe of the user's storage folder under `resumes/{user.id}/`.
//      Storage isn't covered by the ON DELETE CASCADE on auth.users, so we
//      handle it explicitly. Failure here doesn't block the deletion — the
//      orphaned files become inaccessible once the user row is gone.
//   3. Tombstone row in public.account_deletions (email + user_id_was)
//      before the cascade wipes the auth row. This survives the delete so
//      support can confirm "yes, account X was deleted on Y date."
//   4. auth.admin.deleteUser(user.id) — fires ON DELETE CASCADE on all 20
//      user-data FKs and SET NULL on shared resources (companies.created_by,
//      error_logs.user_id).
//
// All cleanup is fire-and-forget on failure EXCEPT the final auth delete —
// if that fails, return 500 so the client knows the account is still alive.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Best-effort storage wipe. List the user's folder and remove
    // everything. If listing fails (e.g. bucket doesn't exist on dev) or
    // partial removal fails, log and continue — orphaned files in a
    // deleted-user folder become unreachable in practice.
    try {
      const { data: files, error: listErr } = await serviceClient.storage
        .from('resumes')
        .list(user.id, { limit: 1000 })
      if (listErr) {
        console.warn(`[delete-account] storage list failed for ${user.id}:`, listErr.message)
      } else if (files && files.length > 0) {
        const paths = files.map(f => `${user.id}/${f.name}`)
        const { error: removeErr } = await serviceClient.storage.from('resumes').remove(paths)
        if (removeErr) {
          console.warn(`[delete-account] storage remove failed for ${user.id}:`, removeErr.message)
        }
      }
    } catch (e) {
      console.warn(`[delete-account] storage cleanup threw for ${user.id}:`, (e as Error).message)
    }

    // 2. Tombstone insert BEFORE the cascade. Best-effort — if this fails
    // we still proceed with deletion because the user's consent already
    // happened client-side; blocking on an audit-table write would be
    // worse UX than a missing tombstone.
    try {
      await serviceClient.from('account_deletions').insert({
        email: user.email ?? null,
        user_id_was: user.id,
      })
    } catch (e) {
      console.warn(`[delete-account] tombstone insert failed for ${user.id}:`, (e as Error).message)
    }

    // 3. The actual delete. If this fails, the account is still alive —
    // surface a 500 so the client can show an error and the user can retry.
    const { error: deleteErr } = await serviceClient.auth.admin.deleteUser(user.id)
    if (deleteErr) {
      console.error(`[delete-account] auth.admin.deleteUser failed for ${user.id}:`, deleteErr.message)
      return new Response(JSON.stringify({ error: 'Account deletion failed. Please try again or contact support.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(null, { status: 204, headers: corsHeaders })
  } catch (error) {
    console.error('[delete-account] unhandled:', (error as Error).message)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
