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
  SIGNUP_COMPLETED:            "signup_completed",
  ONBOARDING_STARTED:          "onboarding_started",
  ONBOARDING_STEP_COMPLETED:   "onboarding_step_completed",
  ONBOARDING_COMPLETED:        "onboarding_completed",
  ONBOARDING_TUTORIAL_STARTED:      "onboarding_tutorial_started",
  ONBOARDING_TUTORIAL_SLIDE_VIEWED: "onboarding_tutorial_slide_viewed",
  ONBOARDING_TUTORIAL_COMPLETED:    "onboarding_tutorial_completed",
  ONBOARDING_TUTORIAL_SKIPPED:      "onboarding_tutorial_skipped",
  CV_GENERATED:                "cv_generated",
  RESUME_UPLOADED:             "resume_uploaded",
  CAREER_ANALYSIS_REFRESHED:   "career_analysis_refreshed",
  JOB_MATCH_CHECKED:           "job_match_checked",
  APPLICATION_TRACKED:         "application_tracked",
  PRACTICUM_COMPANY_ADDED:     "practicum_company_added",
  PRACTICUM_STATUS_CHANGED:    "practicum_status_changed",
  CHAT_MESSAGE_SENT:           "chat_message_sent",
  // Floating feedback widget — fires on successful insert into
  // public.feedback with { category, route } so we can cohort users
  // who flagged each pain category in PostHog.
  FEEDBACK_SUBMITTED:          "feedback_submitted",
  // Stripe-driven — names reserved here so the convention is fixed.
  // Call sites land once Stripe webhooks / billing UI ship.
  SUBSCRIPTION_STARTED:        "subscription_started",
  SUBSCRIPTION_CANCELED:       "subscription_canceled",
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
