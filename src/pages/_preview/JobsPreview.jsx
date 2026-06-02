// Jobs preview harness — DEV-only route at /_preview/jobs/:state.
//
// Pre-seeds a fresh QueryClient with every cache key Jobs reads, then
// stubs `supabase.from("jobs")` + `supabase.rpc("search_jobs_by_role_titles")`
// to return the fixture's job rows. Jobs.jsx stores its job list in
// useState (not React Query) so cache-seeding alone won't work — we
// have to intercept the direct supabase calls.
//
// The stub is applied synchronously inside `useMemo` BEFORE Jobs mounts,
// same race-avoidance pattern as the Home + Roadmap harnesses. The patch
// targets the supabase singleton imported by Jobs.jsx; since each
// Playwright fixture is its own page load, no cleanup is needed.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`.

import React, { useMemo } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import Jobs from "@/pages/Jobs";
import { JOBS_FIXTURES, JOBS_FIXTURE_UID } from "./fixtures/jobs";

function seedCache(qc, fixture) {
  qc.setQueryData(["userProfile", JOBS_FIXTURE_UID], fixture.profile);
  qc.setQueryData(["careerRoles", JOBS_FIXTURE_UID], fixture.careerRoles || []);
  qc.setQueryData(["experiences", JOBS_FIXTURE_UID], fixture.experiences || []);
  qc.setQueryData(["education", JOBS_FIXTURE_UID], fixture.educations || []);
  qc.setQueryData(["certifications", JOBS_FIXTURE_UID], fixture.certifications || []);
  qc.setQueryData(["projects", JOBS_FIXTURE_UID], fixture.projects || []);
}

// Build a thenable that mimics the supabase query-builder chain Jobs.jsx
// uses for the keyword branch: from(...).select(...).eq(...).eq(...).
// .in(...).order(...).range(...).ilike(...). We only need the methods
// Jobs touches; everything else is a no-op that returns the chain.
function buildKeywordChain(rows, loading) {
  const result = loading
    ? { data: null, error: null, _loading: true }
    : { data: rows, error: null };
  const chain = {
    select: () => chain,
    eq:     () => chain,
    in:     () => chain,
    ilike:  () => chain,
    order:  () => chain,
    range:  () => chain,
    // The caller awaits the chain — supabase-js makes query builders
    // PromiseLike. Implementing then() makes `await` resolve with the
    // result object.
    then: (resolve) => {
      // Simulate loading state by NEVER resolving for the loading fixture
      // — Playwright captures the page before the promise resolves.
      if (loading) return; // never resolves; Jobs stays in `loading=true`
      resolve(result);
    },
  };
  return chain;
}

// RPC chain — supabase.rpc("…", {…}).select("…") returns a thenable.
function buildRpcChain(rows, loading) {
  const result = loading
    ? { data: null, error: null, _loading: true }
    : { data: rows, error: null };
  const chain = {
    select: () => chain,
    then: (resolve) => {
      if (loading) return;
      resolve(result);
    },
  };
  return chain;
}

function patchSupabase(fixture) {
  const originalFrom = supabase.from.bind(supabase);
  const originalRpc = supabase.rpc.bind(supabase);

  const jobs = fixture.jobs || [];
  const loading = !!fixture.loading;

  // Jobs.jsx calls `.from("jobs")` for the keyword branch and
  // `.rpc("search_jobs_by_role_titles", ...)` for the track branch.
  // Everything else falls through to the real client (which the
  // QueryClient cache has already short-circuited for the seeded keys).
  supabase.from = (table) => {
    if (table === "jobs") return buildKeywordChain(jobs, loading);
    return originalFrom(table);
  };
  supabase.rpc = (name, params) => {
    if (name === "search_jobs_by_role_titles") return buildRpcChain(jobs, loading);
    return originalRpc(name, params);
  };
}

export default function JobsPreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture = JOBS_FIXTURES[state] || JOBS_FIXTURES["jobs-populated"];

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
    patchSupabase(fixture);
    return qc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const authValue = useMemo(
    () => ({
      user: { id: JOBS_FIXTURE_UID, email: "eli@example.com" },
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

  // Apply the fixture's URL flag synchronously via React Router so
  // useSearchParams() inside Jobs sees it on first render.
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
          <Jobs />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
