// LinkedIn preview harness — DEV-only route at /_preview/linkedin/:state.
//
// 3J-A scope: Profile tab only. Posts + Networking tabs still consume
// `.li-*` classes from LI_CSS — they render normally but aren't the
// fixture target.
//
// Wraps the real Linkedin page in a fresh QueryClient seeded for the
// useProfileQuery selectors, plus a fetch override that mocks the direct
// supabase.from("linkedin_optimizations").maybeSingle() call that
// ProfileTab makes on mount (and the generate-linkedin-content edge
// function used by the error fixture). Synchronous `<Navigate replace>`
// pins ?tab=profile so the harness lands on the Profile tab.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/linkedin/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect, useRef } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Linkedin from "@/pages/Linkedin";
import { LINKEDIN_FIXTURES, LINKEDIN_FIXTURE_UID } from "./fixtures/linkedin";

function seedCache(qc, fixture) {
  // useProfileQuery has a selector pattern: data is cached under
  // ["userProfile", uid] and a selector projects it. Seeding the full
  // row lets all selectors (full_name, location, etc.) read consistently.
  qc.setQueryData(["userProfile", LINKEDIN_FIXTURE_UID], fixture.profile ?? null);
}

// Fetch override — intercepts supabase REST + edge-function calls and
// returns fixture-seeded responses. Cleanup restores the real fetch on
// unmount.
function installFetchOverride(fixture) {
  const real = window.fetch;
  // Track edge-function calls so the error fixture can drive a 429
  // exactly once.
  let edgeCallCount = 0;

  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";

    // PostgREST: linkedin_optimizations.maybeSingle() reads
    if (url.includes("/rest/v1/linkedin_optimizations")) {
      const row = fixture.linkedinOptimizations;
      const body = row ? [row] : [];
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }

    // Edge function: generate-linkedin-content. Error fixture returns
    // the seeded error status. Otherwise return the generated_data row.
    if (url.includes("/functions/v1/generate-linkedin-content")) {
      edgeCallCount += 1;
      if (fixture.generateError) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ error: fixture.generateError.message }),
            {
              status: fixture.generateError.status || 500,
              headers: { "content-type": "application/json" },
            },
          ),
        );
      }
      const generated = fixture.linkedinOptimizations?.generated_data ?? {};
      return Promise.resolve(
        new Response(JSON.stringify(generated), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }

    // Edge function: import-linkedin-archive. Returns ok stub so the
    // harness never blocks on uploads.
    if (url.includes("/functions/v1/import-linkedin-archive")) {
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }

    return real(input, init);
  };

  return () => {
    window.fetch = real;
  };
}

function applyPostMountAction(action) {
  if (!action) return;

  if (action.kind === "toggle-current") {
    const btn = document.querySelector('button[data-mockup-toggle="current"]');
    if (btn && btn instanceof HTMLElement && btn.getAttribute("aria-pressed") !== "true") {
      btn.click();
    }
    return;
  }

  if (action.kind === "open-refine-about") {
    // Find the About section's Refine button. It lives next to the
    // "About" header text. Match by aria-label or by hunting for the
    // Sparkles+Refine combination inside the section flagged by data
    // attribute. Falling back to a textContent match is robust enough
    // for the preview.
    const refineButtons = Array.from(
      document.querySelectorAll('button[title="Refine just this section"]'),
    );
    if (refineButtons.length > 0 && refineButtons[0] instanceof HTMLElement) {
      refineButtons[0].click();
    }
    return;
  }

  if (action.kind === "click-generate") {
    const btn = document.querySelector('button[data-action="generate"]');
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
    return;
  }
}

export default function LinkedinPreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture =
    LINKEDIN_FIXTURES[state] || LINKEDIN_FIXTURES["linkedin-profile-empty"];

  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    });
    seedCache(qc, fixture);
    return qc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Install fetch override for this fixture; restore on unmount.
  const cleanupRef = useRef(null);
  useEffect(() => {
    cleanupRef.current = installFetchOverride(fixture);
    return () => {
      if (typeof cleanupRef.current === "function") cleanupRef.current();
    };
  }, [fixture]);

  const authValue = useMemo(
    () => ({
      user: { id: LINKEDIN_FIXTURE_UID, email: "eli@example.com" },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }),
    [],
  );

  // Post-mount DOM driver. Declared BEFORE the conditional Navigate
  // return so hook order stays stable across the redirect re-render.
  useEffect(() => {
    if (!fixture.postMountAction) return;
    // Two ticks of grace — Linkedin needs to mount, ProfileTab's
    // hydration useEffect needs to fire, the mocked fetch needs to
    // resolve, and the rendered ProfilePreview needs to attach its
    // refine buttons.
    const t1 = setTimeout(() => {
      applyPostMountAction(fixture.postMountAction);
      // Second pass for late-mounted UI (e.g. refine form appearing
      // after the section header click).
      setTimeout(() => applyPostMountAction(fixture.postMountAction), 200);
    }, 300);
    return () => clearTimeout(t1);
  }, [fixture]);

  // Pin ?tab=profile so the harness always lands on the Profile tab.
  // Declared AFTER the hooks above to keep hook order stable.
  if (searchParams.get("tab") !== "profile") {
    return <Navigate to="?tab=profile" replace />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
          <Linkedin />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
