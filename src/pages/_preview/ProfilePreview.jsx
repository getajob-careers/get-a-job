// Profile preview harness — DEV-only route at /_preview/profile/:state.
//
// Wraps the real Profile in a fresh QueryClient seeded on the 6
// canonical Profile-tree query keys, plus a stub AuthContext.
// Synchronous seed inside useMemo per the established pattern (Tracker,
// Jobs, Roadmap, Home).
//
// Each fixture can carry a URL flag (tab / edit). The harness applies
// it via React Router's <Navigate replace> so useSearchParams reads it
// on first render. A post-mount effect drives the experience-edit
// click for the `edit=<id>` variant — that one is local useState
// inside Profile.jsx and can only be toggled by clicking the row's
// Edit button.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/profile/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Profile from "@/pages/Profile";
import { PROFILE_FIXTURES, PROFILE_FIXTURE_UID } from "./fixtures/profile";

function seedCache(qc, fixture) {
  // Six canonical Profile-tree query keys. Loading state =
  // omit profile seed so the userProfile query is in `fetching`
  // and Profile.jsx's `isLoading` drives the skeleton.
  if (!fixture.loading) {
    qc.setQueryData(["userProfile", PROFILE_FIXTURE_UID], fixture.profile ?? null);
  }
  qc.setQueryData(["projects", PROFILE_FIXTURE_UID], fixture.projects ?? []);
  qc.setQueryData(["experiences", PROFILE_FIXTURE_UID], fixture.experiences ?? []);
  qc.setQueryData(["stories", PROFILE_FIXTURE_UID], fixture.stories ?? []);
  qc.setQueryData(["education", PROFILE_FIXTURE_UID], fixture.education ?? []);
  qc.setQueryData(["certifications", PROFILE_FIXTURE_UID], fixture.certifications ?? []);
}

// Post-mount DOM driver. The experience-row Edit button writes to
// Profile's local `expForm` state, so the only way to drive it from
// outside is to click the corresponding button.
function applyUrlActions(searchParams) {
  const edit = searchParams.get("edit");
  if (edit) {
    const btn = document.querySelector(`button[data-exp-edit="${edit}"]`);
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
  }
}

export default function ProfilePreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture = PROFILE_FIXTURES[state] || PROFILE_FIXTURES["profile-populated"];

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
      user: { id: PROFILE_FIXTURE_UID, email: "eli@example.com" },
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

  // Post-mount: apply the URL-encoded view actions. Declared BEFORE
  // the conditional Navigate return so hook order stays stable across
  // the redirect re-render (Tracker lesson).
  useEffect(() => {
    if (!fixture.urlFlag) return;
    // Two ticks of grace for Profile to mount and the experience-row
    // buttons to attach.
    const t1 = setTimeout(() => {
      applyUrlActions(searchParams);
      setTimeout(() => applyUrlActions(searchParams), 120);
    }, 90);
    return () => clearTimeout(t1);
  }, [fixture.urlFlag, searchParams]);

  // Apply the fixture's URL flag synchronously via React Router so
  // useSearchParams() inside Profile sees it on first render. Same
  // pattern as Tracker/Roadmap/Jobs.
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
          <Profile />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
