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
 * Canonical event names. Use these constants at call sites instead of
 * raw strings so typos surface at import time and the full event taxonomy
 * lives in one place. Convention: snake_case, past-tense verbs.
 *
 * If you add a new event, add it here first.
 */
export const EVENTS = {
  SIGNUP_COMPLETED: "signup_completed",
  OAUTH_CALLBACK_FAILED: "oauth_callback_failed",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  // Onboarding V2 born-instrumented taxonomy. step_index follows the ACTUAL
  // screen order (0=cv_upload, 1=review, 2=direction, 3=springboard — the mockup
  // order; the reorder was tried and reverted, see the redesign brief) with a
  // name field carrying semantics. Call sites land in the per-screen PRs.
  ONBOARDING_SCREEN_VIEWED: "onboarding_screen_viewed",
  ONBOARDING_CV_UPLOAD_STARTED: "onboarding_cv_upload_started",
  ONBOARDING_CV_EXTRACT_FAILED: "onboarding_cv_extract_failed",
  ONBOARDING_CV_SKIPPED: "onboarding_cv_skipped",
  // Per-picker-combination audit trail for the primary_domain inference
  // (which goal-family/situation produced which domain) — for corpus audit.
  ONBOARDING_PRIMARY_DOMAIN_INFERRED: "onboarding_primary_domain_inferred",
  ONBOARDING_LAUNCHED_TO_HOME: "onboarding_launched_to_home",
  CV_NUDGE_VIEWED: "cv_nudge_viewed",
  CV_NUDGE_CLICKED: "cv_nudge_clicked",
  CV_NUDGE_DISMISSED: "cv_nudge_dismissed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_TUTORIAL_STARTED: "onboarding_tutorial_started",
  ONBOARDING_TUTORIAL_SLIDE_VIEWED: "onboarding_tutorial_slide_viewed",
  ONBOARDING_TUTORIAL_COMPLETED: "onboarding_tutorial_completed",
  ONBOARDING_TUTORIAL_SKIPPED: "onboarding_tutorial_skipped",
  CV_GENERATED: "cv_generated",
  RESUME_UPLOADED: "resume_uploaded",
  CAREER_ANALYSIS_REFRESHED: "career_analysis_refreshed",
  JOB_MATCH_CHECKED: "job_match_checked",
  APPLICATION_TRACKED: "application_tracked",
  PRACTICUM_COMPANY_ADDED: "practicum_company_added",
  PRACTICUM_STATUS_CHANGED: "practicum_status_changed",
  CHAT_MESSAGE_SENT: "chat_message_sent",
  // Floating feedback widget — fires on successful insert into
  // public.feedback with { category, route } so we can cohort users
  // who flagged each pain category in PostHog.
  FEEDBACK_SUBMITTED: "feedback_submitted",
  // Stripe-driven — names reserved here so the convention is fixed.
  // Call sites land once Stripe webhooks / billing UI ship.
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_CANCELED: "subscription_canceled",
};

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
 * Fire a `cv_generated` event with the canonical schema, from ANY generation
 * entry path (coach, Studio tailor, tracker). Centralised so every surface
 * emits the same props — and, critically, so FAILURES are captured everywhere.
 *
 * The client is the only observer of a platform-level non-2xx (the edge
 * function never runs, so it cannot write its own function_metrics row — see
 * the 2026-07-08 21:14 failure that left no server row). This event is
 * therefore the complete generation-attempt ledger. Always call it in BOTH the
 * success and the catch branch of a generation.
 *
 * @param {object} p
 * @param {boolean} p.success
 * @param {string}  p.source  - "chat" | "studio" | "tracker" | "extension"
 * @param {string}  [p.model]
 * @param {string|null} [p.application_id]
 * @param {string}  [p.role_title]
 * @param {number}  [p.duration_ms]
 * @param {number}  [p.unsourced_bullets_count]
 * @param {string}  [p.failure_reason]  - required-ish when success===false
 */
export function trackCvGenerated({
  success,
  source,
  model,
  application_id = null,
  role_title,
  duration_ms,
  unsourced_bullets_count,
  failure_reason,
}) {
  track(EVENTS.CV_GENERATED, {
    success: !!success,
    source,
    ...(model ? { model } : {}),
    application_id,
    ...(role_title ? { role_title } : {}),
    ...(Number.isFinite(duration_ms) ? { duration_ms } : {}),
    ...(success
      ? { unsourced_bullets_count: unsourced_bullets_count ?? 0 }
      : { failure_reason: failure_reason || "unknown" }),
  });
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
