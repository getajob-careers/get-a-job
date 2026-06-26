// Single PostHog init site for the whole app.
//
// Why a standalone module: init must be callable from two places without
// ever running twice. src/main.jsx may call it before React renders (to
// catch logged-out visitors who bounce before the app mounts), and
// PostHogProvider calls it on mount (the path used when early init is
// disabled). The `initialised` guard guarantees exactly one posthog.init
// across both, so there is no double-init and no duplicate initial pageview.
//
// posthog-js exports a default singleton, so once init runs here every
// other import of `posthog` (analytics.js, PostHogProvider) sees the same
// initialised instance.

import posthog from "posthog-js";

let initialised = false;
// True when init ran with session replay turned off (the early anonymous
// path). PostHogProvider flips replay on at identify via ensureSessionRecording.
let sessionRecordingDeferred = false;

function buildConfig(enableSessionRecording) {
  return {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    // Dev opt-out keeps local and preview events out of the production funnel.
    // Verify real firing via a Vercel preview deploy, not local dev.
    loaded: (ph) => {
      if (import.meta.env.MODE !== "production") ph.opt_out_capturing();
    },
    // Auto-capture pageviews on initial load and on React Router history
    // changes (pushState / replaceState / popstate). The initial pageview
    // fires at init, which is the whole point of calling init early.
    capture_pageview: "history_change",
    capture_pageleave: true,
    // Built-in unhandled-error + promise-rejection capture.
    capture_exceptions: true,
    // Session replay is gated to identified sessions. When init runs early
    // for anonymous visitors we start with replay off and turn it on only
    // after a user is identified, so logged-out sessions are never recorded.
    // When enableSessionRecording is true (the authenticated-only path used
    // when early init is disabled) this matches the prior behaviour exactly.
    disable_session_recording: !enableSessionRecording,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-private]",
    },
    // Skip default click/input autocapture. We fire explicit named events
    // for the actions that represent value: cleaner data, lower volume.
    autocapture: false,
    // Only create person profiles once we have identify()'d. Anonymous
    // pageviews are still captured as events, they just do not create a
    // person profile until login.
    person_profiles: "identified_only",
  };
}

/**
 * Initialise PostHog once. Idempotent: safe to call from both main.jsx and
 * PostHogProvider. Never throws, so it can never block app boot.
 *
 * @param {{ enableSessionRecording?: boolean }} [opts]
 *   enableSessionRecording defaults to true so the authenticated-only path
 *   (early init disabled) is byte-for-byte the prior behaviour. The early
 *   anonymous path passes false.
 * @returns the posthog singleton, or null when analytics is disabled.
 */
export function initPostHog({ enableSessionRecording = true } = {}) {
  if (initialised) return posthog;
  // Kill switch: set VITE_POSTHOG_DISABLE=true to skip analytics entirely.
  // Reversible via env, no code change required.
  if (import.meta.env.VITE_POSTHOG_DISABLE === "true") return null;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;
  if (!key || !host) {
    console.warn(
      "[posthog] missing VITE_POSTHOG_KEY or VITE_POSTHOG_HOST, analytics disabled",
    );
    return null;
  }
  try {
    posthog.init(key, buildConfig(enableSessionRecording));
    initialised = true;
    sessionRecordingDeferred = !enableSessionRecording;
  } catch (err) {
    // Analytics init must never break app boot. Swallow and disable.
    console.warn("[posthog] init failed, analytics disabled:", err);
    return null;
  }
  return posthog;
}

/**
 * Start session replay if it was deferred at init (the early anonymous
 * path). No-op when replay was already enabled at init or analytics is off.
 * Called by PostHogProvider once a user is identified, so replay only ever
 * covers identified sessions.
 */
export function ensureSessionRecording() {
  if (!initialised || !sessionRecordingDeferred) return;
  try {
    posthog.startSessionRecording();
    sessionRecordingDeferred = false;
  } catch (err) {
    console.warn("[posthog] startSessionRecording failed:", err);
  }
}
