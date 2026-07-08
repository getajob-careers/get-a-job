-- onboarding_events — client-emitted breadcrumbs for the onboarding CV-upload
-- leg (upload + parse), the one path with no server-side observability.
--
-- Why this exists: the CV-upload step has three legs the student can die on —
-- the storage .upload(), the extract-cv-text edge function, and the ai-chat
-- resume-extractor. Only the two edge functions emit function_metrics, and a
-- metric is written only if the function returns/throws. The FIRST leg (the
-- browser -> Storage upload) and any hang where the finally never runs are
-- invisible. That blind spot hid a real user (Sammy) failing the exact same
-- step 7+ times across two accounts since May 2026 with ZERO diagnostic trail
-- — the failing leg was only found by pulling his file and re-running the
-- pipeline by hand. These breadcrumbs make each leg visible in the DB.
--
-- Coexists with function_metrics (per-edge-call cost/latency, service-role
-- written) and log_error (failure forensics). onboarding_events is
-- client-emitted, cheap, and scoped to the onboarding funnel.
--
-- Writer contract: the client NEVER writes this table directly (RLS denies
-- it). It calls the SECURITY DEFINER RPC log_onboarding_event, which stamps
-- user_id from auth.uid() server-side (un-spoofable) and is null-tolerant so
-- a stray pre-auth call is a silent no-op — logging must NEVER break the flow
-- it observes.

CREATE TABLE IF NOT EXISTS public.onboarding_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step       integer,
  event      text NOT NULL,
  error_code text,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_user_created
  ON public.onboarding_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_event_created
  ON public.onboarding_events (event, created_at DESC);

-- RLS: deny-all to clients. Written ONLY through the RPC (SECURITY DEFINER
-- bypasses RLS as owner); read by admin/service role.
ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.onboarding_events IS
  'Client-emitted onboarding funnel breadcrumbs (CV upload/parse legs). Written only via log_onboarding_event RPC; RLS deny-all. Coexists with function_metrics + log_error.';

-- log_onboarding_event — the sole writer. SECURITY DEFINER, hardened per the
-- 2026-05-13 audit pattern (search_path pinned; anon revoked). auth.uid() is
-- stamped server-side (un-spoofable); NULL uid is a silent no-op so a
-- breadcrumb never surfaces as a failure in the flow it observes.
CREATE OR REPLACE FUNCTION public.log_onboarding_event(
  p_step       integer,
  p_event      text,
  p_error_code text DEFAULT NULL,
  p_detail     jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.onboarding_events (user_id, step, event, error_code, detail)
  VALUES (auth.uid(), p_step, left(p_event, 64), left(p_error_code, 64), p_detail);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_onboarding_event(integer, text, text, jsonb)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.log_onboarding_event(integer, text, text, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.log_onboarding_event(integer, text, text, jsonb) IS
  'Sole writer for onboarding_events. Stamps user_id from auth.uid() (un-spoofable); NULL-uid is a no-op. Called fire-and-forget from StepResumeUpload.';
