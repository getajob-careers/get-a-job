import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { track, captureException, EVENTS } from "@/lib/analytics";

// OAuth callback. Mounted in the PUBLIC routes block in App.jsx, OUTSIDE
// AuthenticatedApp: the session does not exist yet when this renders, so
// it must not be gated on auth.
//
// Google redirects here after consent. We turn that redirect into a
// session and then send the user to /Onboarding, where the (null-tolerant)
// profile insert runs for a brand-new OAuth user; Home's onboarding guard
// is the backstop that re-funnels any logged-in user who still has no
// profile row. On any failure we route back to /login with a readable
// error (Login reads ?oauth_error).
//
// Flow-agnostic on purpose: supabase-js may auto-establish the session
// from the URL (detectSessionInUrl is on by default), so we check for an
// existing session first and only fall back to exchangeCodeForSession
// (the PKCE path) when one is not already present. This keeps the route
// correct whichever path the SDK takes and avoids a double-exchange race.
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) navigate("/Onboarding", { replace: true });
    };
    // Surface the REAL cause server-side (PostHog) before showing the user a
    // generic message. Previously the exchange error was swallowed into a
    // generic string with no server-side trail, so a systematic OAuth failure
    // (e.g. the zero-event no-profile signups) was invisible. `stage` + the
    // real error are captured; the user still sees a readable, non-technical
    // message. captureException/track are safe no-ops if PostHog isn't ready.
    const fail = (userMsg, stage, realError) => {
      if (realError) {
        console.error(`[AuthCallback] OAuth ${stage} failed:`, realError);
        captureException(
          realError instanceof Error ? realError : new Error(String(realError)),
          { surface: "auth_callback", stage },
        );
      }
      track(EVENTS.OAUTH_CALLBACK_FAILED, { stage: stage || "unknown" });
      if (!cancelled) {
        navigate(`/login?oauth_error=${encodeURIComponent(userMsg)}`, {
          replace: true,
        });
      }
    };

    (async () => {
      try {
        // If the SDK already established the session from the URL, use it.
        const { data: existing } = await supabase.auth.getSession();
        if (existing?.session) return finish();

        // PKCE fallback: exchange the ?code= for a session.
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );
        if (error) {
          // The code may have already been consumed (auto-detect won the
          // race); if a session exists now, proceed, else surface the error.
          const { data: after } = await supabase.auth.getSession();
          if (after?.session) return finish();
          return fail(
            "Sign-in could not be completed. Please try again.",
            "exchange",
            error,
          );
        }
        return finish();
      } catch (err) {
        return fail(
          "Sign-in could not be completed. Please try again.",
          "unhandled",
          err,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-rd-bg-page text-rd-text">
      <div className="w-8 h-8 border-4 border-rd-border border-t-rd-primary rounded-full animate-spin" />
      <p className="text-[13.5px] text-rd-text-secondary">
        Completing sign-in...
      </p>
    </div>
  );
}
