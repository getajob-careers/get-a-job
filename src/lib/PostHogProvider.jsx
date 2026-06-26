import React, { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useAuth } from "@/lib/AuthContext";
import { track, EVENTS } from "@/lib/analytics";

// PostHog initialization + identity sync. Mounted only inside
// AuthenticatedApp so the landing / login / reset-password pages never
// load PostHog (matches the pilot requirement to keep unauthenticated
// traffic untracked).
//
// Lifecycle:
//   - Mount: init posthog with EU host + the production-only opt-out
//   - User loads: identify with user.id + email
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
  const initialisedRef = useRef(false);

  // One-shot init on first mount.
  useEffect(() => {
    if (initialisedRef.current) return;
    const key = import.meta.env.VITE_POSTHOG_KEY;
    const host = import.meta.env.VITE_POSTHOG_HOST;
    if (!key || !host) {
      console.warn("[posthog] missing VITE_POSTHOG_KEY or VITE_POSTHOG_HOST — analytics disabled");
      return;
    }
    posthog.init(key, {
      api_host: host,
      // Dev opt-out — keeps test events out of the production funnel.
      // Run via Vercel preview deploy to verify events actually fire.
      loaded: (ph) => {
        if (import.meta.env.MODE !== "production") ph.opt_out_capturing();
      },
      // Auto-capture pageviews on React Router history changes
      // (pushState / replaceState / popstate).
      capture_pageview: "history_change",
      capture_pageleave: true,
      // Built-in unhandled-error + promise-rejection capture.
      capture_exceptions: true,
      // Session replay — all inputs masked by default for the pilot.
      // Specific safe elements can be unmasked later via data-attr-mask="false"
      // or by marking sensitive ones via data-private.
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-private]",
      },
      // Skip the default click/input autocapture — we'll fire explicit
      // named events for the actions that represent value. Cleaner data,
      // easier to query, lower event volume.
      autocapture: false,
      // Only create person profiles once we've identify()'d. Anonymous
      // sessions (the brief window before useEffect runs) don't pollute
      // the people view.
      person_profiles: "identified_only",
    });
    initialisedRef.current = true;
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
          : (user.app_metadata?.provider || "oauth");
        track(EVENTS.SIGNUP_COMPLETED, { method });
        localStorage.removeItem("gaj.signup_pending");
        localStorage.setItem("gaj.signup_recorded", user.id);
      }
    } catch { /* localStorage unavailable */ }
    return () => {
      posthog.reset();
    };
  }, [user?.id, user?.email, user?.created_at]);

  return <>{children}</>;
}
