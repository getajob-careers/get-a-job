// Thin wrapper around the PostHog singleton so call sites don't import
// posthog-js directly. Two reasons:
//   1. If we swap analytics providers later, we change one file, not 30.
//   2. Every call is wrapped in try/catch so a misconfigured PostHog (or
//      an event fired before init completes) can't crash the app.
//
// posthog-js exports a default singleton — once posthog.init() runs in
// PostHogProvider, every other import of `posthog` from posthog-js sees
// the same initialized instance.

import posthog from "posthog-js";

/**
 * Fire a named analytics event. Properties is a flat object — keep it
 * shallow (PostHog handles nested objects but they're harder to query).
 */
export function track(event, properties = {}) {
  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.warn("[analytics] capture failed:", err);
  }
}

/**
 * Forward an error to PostHog's error-tracking ingest. Used by
 * GlobalErrorBoundary and any catch block that wants explicit reporting.
 * Safe to call before PostHog initializes — will no-op via the try/catch.
 */
export function captureException(error, properties = {}) {
  try {
    posthog.captureException(error, properties);
  } catch (err) {
    console.warn("[analytics] captureException failed:", err);
  }
}
