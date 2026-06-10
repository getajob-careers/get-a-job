// Home preview harness — DEV-only route at /_preview/home/:state.
//
// Pre-seeds a fresh QueryClient with every cache key Home reads, then
// mounts the real Home inside an AuthContext stub + the new
// QueryClientProvider. No Supabase network calls fire for the rendered
// branch because each query's data is already in cache with staleTime
// Infinity. The error-banner fixture uses queryClient.setQueryData on
// the *error* form (a thrown promise via setQueryData + a manual
// invalidate would be flakey, so instead we seed an empty data set AND
// route the fixture through a tiny ErrorOverride context that the
// harness wraps in — see ForceErrorContext below).
//
// Production safety: the entire route registration in App.jsx is gated
// by `import.meta.env.DEV` — identical pattern to the onboarding +
// shell harnesses. Prod /_preview/home/* falls through to
// AuthenticatedApp → /login.

import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Home from "@/pages/Home";
import Layout from "@/Layout";
import { HOME_FIXTURES, HOME_FIXTURE_UID, HOME_FIXTURE_DATE } from "./fixtures/home";

function seedCache(qc, fixture) {
  // Canonical query keys — same shape Home.jsx reads. The order matches
  // the file for grep-ability.
  qc.setQueryData(["userProfile", HOME_FIXTURE_UID], fixture.profile);
  qc.setQueryData(["careerRoles", HOME_FIXTURE_UID], fixture.roles || []);
  qc.setQueryData(["applications", HOME_FIXTURE_UID], fixture.applications || []);
  qc.setQueryData(["tasks", HOME_FIXTURE_UID], fixture.tasks || []);
  qc.setQueryData(["experiences", HOME_FIXTURE_UID], fixture.experiences || []);
  qc.setQueryData(["certifications", HOME_FIXTURE_UID], fixture.certifications || []);
  qc.setQueryData(["projects", HOME_FIXTURE_UID], fixture.projects || []);
  qc.setQueryData(["daily_action_home", HOME_FIXTURE_UID, HOME_FIXTURE_DATE], fixture.dailyAction ?? null);
  qc.setQueryData(["live_matches_home", HOME_FIXTURE_UID], fixture.liveMatchCount ?? null);

  // Error simulation: setQueryData can't set an isError=true state, but
  // we can synthesize it by inserting an Error directly into the
  // QueryCache. React Query treats query state.error as the source of
  // truth for isError, so this drives the rolesError / appsError
  // branches in Home without a real network failure.
  if (Array.isArray(fixture.forceErrors)) {
    fixture.forceErrors.forEach((keyName) => {
      const queryKey = [keyName, HOME_FIXTURE_UID];
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

export default function HomePreview() {
  const { state } = useParams();
  const fixture = HOME_FIXTURES[state] || HOME_FIXTURES["home-empty"];

  // Seed synchronously inside the useMemo factory so the cache is
  // populated BEFORE Home's first render. Doing this in a useEffect
  // races Home's redirect-to-Onboarding effect (which fires when
  // profileFetched=false → falls through to !profile branch, navigating
  // away from the preview before the seed effect catches up).
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

  // The harness mounts inside the production AuthProvider already
  // (App.jsx wraps Routes in AuthProvider). The inner AuthContext.Provider
  // overrides it for this subtree only — Home reads a fixture user with
  // a stable id so the seeded cache keys resolve.
  const authValue = useMemo(
    () => ({
      user: { id: HOME_FIXTURE_UID, email: "eli@example.com" },
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

  // Some fixtures need a URL flag (e.g. self-heal preview). Set it on
  // window.location before Home mounts; Home's URL-flag read is
  // synchronous in render so this is enough. The DOM URL itself stays
  // /_preview/home/<state> — we only mutate the search string.
  useEffect(() => {
    if (!fixture.urlFlag) return;
    const url = new URL(window.location.href);
    fixture.urlFlag.split("&").forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k) url.searchParams.set(k, v ?? "");
    });
    window.history.replaceState(null, "", url.toString());
  }, [fixture.urlFlag]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        {/* Render Home inside the real Layout (sidebar + chrome) so the
            preview shows the full-page picture. Layout reads the stubbed
            auth user + the seeded userProfile cache — no network. */}
        <Layout currentPageName="Home">
          <Home />
        </Layout>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
