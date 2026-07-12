// Recovery for a desynced Supabase session.
//
// Investigation 2026-07-12: a long-lived session can drift out of sync — the app
// still holds a `user` object (so user-scoped queries fire and PostHog identifies
// the user), but the underlying JWT is stale. Reads then fail one of two ways:
//   - stale/invalid JWT  → PostgREST 401 (PGRST301, "No suitable key…")
//   - session fully dropped → anon fallback → 200 with 0 rows
// Both render as "you have 0 applications" unless the surface surfaces the error.
//
// This helper attempts ONE session refresh on an auth-shaped read error; if the
// refresh fails it signs the user out so they re-authenticate cleanly. It is
// flag-gated (default OFF) and one-shot per page load, so it can never loop.
import { supabase } from "@/api/supabaseClient";

export const AUTH_DESYNC_RECOVERY_ON =
  import.meta.env.VITE_FLAG_AUTH_DESYNC_RECOVERY === "on";

// Module-level, never reset within a page lifetime → at most one refresh attempt.
// A full reload (the natural outcome of signOut → login) clears it.
let attempted = false;

/** True for the PostgREST/GoTrue error shapes that mean "the JWT is bad". */
export function isAuthError(err) {
  if (!err) return false;
  const code = err.code ?? err.status;
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    code === "PGRST301" ||
    code === 401 ||
    code === "401" ||
    msg.includes("jwt") ||
    msg.includes("no suitable key")
  );
}

/**
 * Attempt a single session refresh for an auth-shaped read error.
 * @returns {Promise<boolean>} true only when the session was refreshed and the
 *   caller should refetch. false when disabled, not an auth error, already
 *   attempted, or the refresh failed (in which case the user is signed out).
 */
export async function recoverFromAuthError(err) {
  if (!AUTH_DESYNC_RECOVERY_ON) return false;
  if (!isAuthError(err)) return false;
  if (attempted) return false;
  attempted = true;
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data?.session) {
      await supabase.auth.signOut();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
