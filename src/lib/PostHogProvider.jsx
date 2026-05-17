import React, { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useAuth } from "@/lib/AuthContext";

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
    return () => {
      posthog.reset();
    };
  }, [user?.id, user?.email, user?.created_at]);

  return <>{children}</>;
}
