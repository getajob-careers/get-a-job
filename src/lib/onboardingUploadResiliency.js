// onboardingUploadResiliency — feature-flag + timeout helper for the
// CV-upload render-path hardening (timeouts + honest failure handoff).
//
// STAGING (per PR #156's lesson — never ship a production-critical path
// without an opt-in test first): the breadcrumb logging ships unconditionally
// (additive, no UX change), but the render-path changes here — the 30s
// timeouts and the always-forward failure banner — are gated OFF by default.
// Eli opt-in-tests by setting the flag, confirms the happy path is unchanged
// and a forced failure now shows a recoverable banner, then a one-line
// follow-up flips DEFAULT_ON to true for everyone.
//
// Enable (any one): URL `?onbfix=1`, or localStorage `gaj.onb.upload_resiliency=1`.

const DEFAULT_ON = true; // enabled 2026-07-08 after live opt-in smoke test (full 4-event happy path verified in prod)

export function resilientUploadEnabled() {
  if (DEFAULT_ON) return true;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("onbfix") === "1") return true;
    if (localStorage.getItem("gaj.onb.upload_resiliency") === "1") return true;
  } catch {
    /* SSR / private mode — fall through to off */
  }
  return false;
}

export const UPLOAD_TIMEOUT_MS = 30_000;
// The resume-extractor runs on a reasoning model (gpt-5.4-mini) whose latency
// is variable and can exceed 10s legitimately, so its leg gets a wider cap
// than the storage upload / text-extract legs. Tunable in one place.
export const PARSE_TIMEOUT_MS = 45_000;

// withTimeout — races a promise against a timer, and (when the underlying
// call supports it) aborts the in-flight request via the provided
// AbortController so we stop waiting AND stop the work. Rejects with an
// Error whose `.code === 'timeout'` so callers branch on it uniformly.
//
// `run(signal)` receives the AbortSignal to thread into supabase-js
// (both storage.upload and functions.invoke accept `signal` in v2.99).
export function withTimeout(run, ms, label = "operation") {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        /* noop */
      }
      /** @type {Error & { code?: string }} */
      const e = new Error(`${label} timed out after ${Math.round(ms / 1000)}s`);
      e.code = "timeout";
      reject(e);
    }, ms);
  });
  return Promise.race([
    Promise.resolve(run(controller.signal)),
    timeout,
  ]).finally(() => clearTimeout(timer));
}
