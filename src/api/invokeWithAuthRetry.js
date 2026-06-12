import { supabase } from "./supabaseClient";

// Wrapper around supabase.functions.invoke that turns the stale-JWT class
// of 401s into a one-shot refresh + retry. Without this, the client
// happily retries a failed invoke with the same expired access token —
// the pattern that produced the 2026-06-10 retry storms in production:
//
//   00:03:38 / 00:03:40 / 00:03:41  — generate-tailored-cv x3 (within 3s)
//   09:29:48 / 09:30:03             — generate-career-analysis x2 (within 15s)
//
// All six rows: user_id NULL, http_status 401, error_code 'auth',
// latency <700ms. The function's auth.getUser() guard rejected the JWT
// before any handler logic ran; the client treated it as a generic 5xx
// and let the user (or React Strict Mode + retry) re-fire the call with
// the same stale token.
//
// Semantics:
//
//   1. Invoke the function. On any non-401 outcome, return as-is.
//   2. On 401, call supabase.auth.refreshSession() ONCE.
//        - If refresh fails (refresh token revoked, network error, etc.):
//          → call supabase.auth.signOut() to trigger AuthContext's
//            SIGNED_OUT redirect, return the original error with
//            `isAuthExpired = true` so callers can show a clean
//            "session expired" message instead of a generic 5xx toast.
//        - If refresh succeeds: retry the invoke ONCE.
//   3. If the retry STILL returns 401, the underlying credential is
//      invalid (not just expired) → same signOut + isAuthExpired path.
//   4. If the retry succeeds, return its { data, error: null } payload.
//
// The return shape mirrors supabase.functions.invoke so call sites can
// swap with one find-and-replace. The added `error.isAuthExpired` field
// is the only behavioral signal a caller needs to check if it wants to
// customize the toast — the redirect happens regardless.

const is401 = (error) => error?.context?.status === 401;

const markExpired = (error) => {
  if (error && typeof error === "object") {
    try { error.isAuthExpired = true; } catch { /* frozen — ignore */ }
  }
  return error;
};

export async function invokeWithAuthRetry(functionName, options = {}) {
  const first = await supabase.functions.invoke(functionName, options);
  if (!is401(first.error)) return first;

  // 401 — try a one-shot refresh.
  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    // Refresh token rejected or network failed. The user's session is
    // unrecoverable from the client; sign them out so AuthContext drives
    // a redirect to /login on the next render.
    try { await supabase.auth.signOut(); } catch { /* ignore — already signed out */ }
    return { data: null, error: markExpired(first.error) };
  }

  // Refresh succeeded. Re-issue the same invoke ONCE with the rotated JWT.
  const second = await supabase.functions.invoke(functionName, options);
  if (is401(second.error)) {
    // Still 401 after a fresh JWT — the credential isn't merely expired,
    // it's invalid (e.g. user record deleted, JWT revoked server-side).
    // Same fall-through: sign out, surface a clean expired signal.
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    return { data: null, error: markExpired(second.error) };
  }
  return second;
}
