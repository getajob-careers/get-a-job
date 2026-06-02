// Roadmap preview harness — DEV-only route at /_preview/roadmap/:state.
//
// Pre-seeds a fresh QueryClient with every cache key Roadmap reads, then
// mounts the real Roadmap inside an AuthContext stub + the new
// QueryClientProvider. Identical pattern to HomePreview — the cache seed
// happens SYNCHRONOUSLY inside the useMemo factory so it lands before
// Roadmap's first render (which would otherwise hit the redirect-to-
// Onboarding fallthrough on an undefined profile).
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV` — identical pattern to the onboarding + shell +
// home harnesses.

import React, { useMemo } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Roadmap from "@/pages/Roadmap";
import { ROADMAP_FIXTURES, ROADMAP_FIXTURE_UID } from "./fixtures/roadmap";

function seedCache(qc, fixture) {
  // Canonical query keys — same shape Roadmap.jsx reads.
  qc.setQueryData(["userProfile", ROADMAP_FIXTURE_UID], fixture.profile);
  qc.setQueryData(["careerRoles", ROADMAP_FIXTURE_UID], fixture.roles || []);
  qc.setQueryData(["experiences", ROADMAP_FIXTURE_UID], fixture.experiences || []);
  qc.setQueryData(["education", ROADMAP_FIXTURE_UID], fixture.educations || []);
  qc.setQueryData(["certifications", ROADMAP_FIXTURE_UID], fixture.certifications || []);
  qc.setQueryData(["projects", ROADMAP_FIXTURE_UID], fixture.projects || []);

  // roadmap_tier1_jobs query is gated on `track1RoleTitles.length > 0`
  // AND `!!user?.id`. When there are no Track-1 roles it never fires.
  // When there ARE Track-1 roles, we don't try to mirror the variable
  // key shape exactly — instead we seed against the same JOINED-string
  // shape Roadmap.jsx constructs, which is "" / "" / "" by default for
  // empty arrays. With work_type=["Hybrid","Remote"] in the fixture
  // profile and the experience-level helper running off empty
  // experiences (→ "entry"), the resulting key is stable.
  //
  // The preview deliberately seeds an EMPTY result so the live-jobs
  // RPC never fires — even if the cache key shape drifts, the page
  // gracefully shows "no live matches" and the rest of the body still
  // renders. PR 3C dropped the Overview tab so this surface only
  // matters for the legacy URL state.

  // Error simulation — same pattern as HomePreview.
  if (Array.isArray(fixture.forceErrors)) {
    fixture.forceErrors.forEach((keyName) => {
      const queryKey = [keyName, ROADMAP_FIXTURE_UID];
      const query = qc.getQueryCache().find({ queryKey });
      if (query) {
        query.setState({
          ...query.state,
          status: "error",
          error: new Error(`fixture-forced-error: ${keyName}`),
          fetchStatus: "idle",
          dataUpdatedAt: Date.now(),
        });
      }
    });
  }
}

export default function RoadmapPreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture = ROADMAP_FIXTURES[state] || ROADMAP_FIXTURES["roadmap-why"];

  // Hooks must run unconditionally before any early return — so we
  // compute QueryClient + auth here, then decide whether to short-
  // circuit to <Navigate> below.
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

  const authValue = useMemo(
    () => ({
      user: { id: ROADMAP_FIXTURE_UID, email: "eli@example.com" },
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

  // Apply the fixture's URL flags THROUGH React Router (not via raw
  // window.history.replaceState) so useSearchParams() inside Roadmap
  // sees them on its first render. The prior approach used a useEffect
  // — but useEffect fires AFTER Roadmap's first render, by which point
  // useSearchParams had already read the URL (no flag) and Roadmap's
  // activeTab fell back to the default "why". Same kind of race the
  // QueryClient seed already worked around by moving into useMemo.
  // <Navigate replace> short-circuits this render; React Router
  // updates the URL synchronously; the harness re-renders with the
  // right URL; THEN Roadmap mounts and reads activeTab=track_N.
  if (fixture.urlFlag) {
    const required = new URLSearchParams(fixture.urlFlag);
    let needsRedirect = false;
    for (const [k, v] of required.entries()) {
      if (searchParams.get(k) !== v) {
        needsRedirect = true;
        break;
      }
    }
    if (needsRedirect) {
      return <Navigate to={`?${fixture.urlFlag}`} replace />;
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
          <Roadmap />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
