// logOnboardingEvent — fire-and-forget onboarding funnel breadcrumb.
//
// Closes the observability blind spot on the CV-upload step: the browser ->
// Storage upload leg and any client-side hang produce no function_metrics
// row, so a failure there is invisible in the DB (this hid a real user
// failing the same step 7+ times since May with no trace). Each leg now
// emits a row via the log_onboarding_event RPC.
//
// HARD CONTRACT: this NEVER throws and NEVER blocks. A breadcrumb must not
// break the flow it is trying to observe. Every failure path is swallowed.
//
// Events (step 0 = CV upload): upload_attempt -> upload_ok | upload_failed,
// parse_attempt -> parse_ok | parse_failed. errorCode is a short categorical
// tag; detail is a small context blob ({ file_type, size, ms, message }).

import { supabase } from "@/api/supabaseClient";

export function logOnboardingEvent(
  step,
  event,
  { errorCode = null, detail = null } = {},
) {
  try {
    const p = supabase.rpc("log_onboarding_event", {
      p_step: typeof step === "number" ? step : null,
      p_event: String(event),
      p_error_code: errorCode ? String(errorCode).slice(0, 64) : null,
      p_detail: detail ?? null,
    });
    // supabase-js returns a thenable builder; guard both rejection and a
    // returned { error } without ever surfacing to the caller.
    if (p && typeof p.then === "function") {
      p.then(
        ({ error } = {}) => {
          if (error) console.debug("[onb-event] rpc non-fatal:", error.message);
        },
        () => {},
      );
    }
  } catch {
    /* never throw from a breadcrumb */
  }
}
