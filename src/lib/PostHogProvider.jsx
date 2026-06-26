import React, { useEffect } from "react";
import posthog from "posthog-js";
import { useAuth } from "@/lib/AuthContext";
import { track, EVENTS } from "@/lib/analytics";
import { initPostHog, ensureSessionRecording } from "@/lib/posthogClient";

// PostHog identity sync. Initialisation itself lives in posthogClient.js so
// it can also run from src/main.jsx before render (the early-capture path
// gated by VITE_POSTHOG_EARLY_INIT). When that flag is off, this provider is
// the single init site and behaviour matches the prior authenticated-only
// setup (replay enabled at init). The init call below is idempotent, so it
// is a no-op when main.jsx already initialised early.
//
// Lifecycle:
//   - Mount: ensure posthog is initialised (no-op if already done early)
//   - User loads: identify with user.id + email, then enable session replay
//     if it was deferred for the anonymous early-capture path
//   - Unmount (logout): reset() so the next signed-in user doesn't
//     inherit this person's distinct_id

// True only for the FIRST sign-in of an account — i.e. a brand-new
// signup. Supabase stamps created_at and last_sign_in_at at the same auth
// event when the account is created, so they coincide (within seconds) on
// signup and diverge on every later login. This is what lets a Google
// OAuth signup fire signup_completed exactly once without re-firing for
// returning Google logins (signInWithOAuth can't tell new from returning
// up front, so there is no pre-redirect flag to set as the email path
// has). The caller's per-user latch covers a page refresh, where neither
// timestamp moves.
function isFirstSignIn(user) {
  const created = Date.parse(user?.created_at || "");
  if (Number.isNaN(created)) return false;
  const lastSignIn = Date.parse(user?.last_sign_in_at || "");
  if (!Number.isNaN(lastSignIn)) {
    return Math.abs(lastSignIn - created) < 60_000; // same auth event
  }
  // Fallback when last_sign_in_at is absent: a very fresh account.
  return Date.now() - created < 10 * 60_000;
}

export default function PostHogProvider({ children }) {
  const { user } = useAuth();

  // Ensure PostHog is initialised. No-op when main.jsx already ran early
  // init; otherwise this is the single init site (authenticated-only path,
  // replay enabled at init exactly as before).
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify whenever the user object is set; reset on unmount or when
  // user changes (the cleanup runs before the next effect fires, so a
  // logout → unmount of this provider triggers reset cleanly).
  useEffect(() => {
    if (!user?.id) return;
    posthog.identify(user.id, {
      email: user.email,
      signup_date: user.created_at,
    });
    // If early init deferred session replay (the anonymous early-capture
    // path), start it now that we have an identified user. No-op when replay
    // was already enabled at init. Keeps replay scoped to identified sessions.
    ensureSessionRecording();
    // Fire signup_completed exactly once per genuinely-new user, on the
    // first PostHog-identified session, for BOTH signup methods:
    //   - Email: Login.jsx sets gaj.signup_pending after signUp. Email
    //     confirmation means the event can't fire from /login itself, so
    //     it drains here.
    //   - OAuth (Google): no pre-redirect flag is possible, so we detect a
    //     first sign-in from Supabase's timestamps (see isFirstSignIn).
    // The per-user latch (gaj.signup_recorded = user.id) makes a refresh
    // inside the signup window unable to re-fire, and keys by id so a
    // returning login — or a different user on a shared device — is
    // handled correctly. Method comes from the explicit email flag, else
    // from Supabase's auth provider.
    try {
      const recorded = localStorage.getItem("gaj.signup_recorded") === user.id;
      const pendingEmail = localStorage.getItem("gaj.signup_pending") === "1";
      if (!recorded && (pendingEmail || isFirstSignIn(user))) {
        const method = pendingEmail
          ? "email"
          : user.app_metadata?.provider || "oauth";
        track(EVENTS.SIGNUP_COMPLETED, { method });
        localStorage.removeItem("gaj.signup_pending");
        localStorage.setItem("gaj.signup_recorded", user.id);
      }
    } catch {
      /* localStorage unavailable */
    }
    return () => {
      posthog.reset();
    };
  }, [user?.id, user?.email, user?.created_at]);

  return <>{children}</>;
}
