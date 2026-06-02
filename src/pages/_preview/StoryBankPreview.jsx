// StoryBank preview harness — DEV-only route at /_preview/storybank/:state.
//
// Wraps the real StoryBank in a fresh QueryClient seeded on the
// canonical ["stories", uid] + ["experiences", uid] keys, plus a stub
// AuthContext. Synchronous seed inside useMemo per the established
// pattern (Tracker, Profile, Jobs, Roadmap, Home).
//
// Each fixture can carry a URL flag (filter) or a post-mount DOM driver
// flag (expandStoryId / deleteConfirmStoryId / openAddDialog / editStoryId).
// URL flags apply via React Router's <Navigate replace> so useSearchParams
// reads them on first render. DOM-driver flags fire from a post-mount
// effect because the corresponding UI state lives in local useState
// inside StoryBank.jsx / StoryCard.jsx — the only way to drive it
// without modifying production code is a click.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/storybank/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import StoryBank from "@/pages/StoryBank";
import { STORYBANK_FIXTURES, STORYBANK_FIXTURE_UID } from "./fixtures/storybank";

function seedCache(qc, fixture) {
  // Seed both queries StoryBank reads. Loading state = omit the stories
  // seed so the query stays in `fetching` and the page's
  // `storiesLoading` flag drives the spinner.
  if (!fixture.loading) {
    qc.setQueryData(["stories", STORYBANK_FIXTURE_UID], fixture.stories ?? []);
  }
  qc.setQueryData(["experiences", STORYBANK_FIXTURE_UID], fixture.experiences ?? []);
}

// Post-mount DOM driver. The card-expand toggle, delete-confirm, and
// dialog-open flows all live in local useState inside StoryBank.jsx /
// StoryCard.jsx — the only way to drive them from outside is a click.
function applyDomActions(fixture) {
  if (fixture.expandStoryId) {
    const btn = document.querySelector(`button[data-story-toggle="${fixture.expandStoryId}"]`);
    if (btn && btn instanceof HTMLElement && btn.getAttribute("aria-expanded") !== "true") {
      btn.click();
    }
  }
  if (fixture.deleteConfirmStoryId) {
    const btn = document.querySelector(`button[data-story-delete="${fixture.deleteConfirmStoryId}"]`);
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
  }
  if (fixture.openAddDialog) {
    const buttons = Array.from(document.querySelectorAll("button"));
    const match = buttons.find((b) => b.textContent?.trim() === "Add story");
    if (match && match instanceof HTMLElement) {
      match.click();
    }
  }
  if (fixture.editStoryId) {
    // StoryCard's Edit button is a child <button> inside the row toggle.
    // We rely on the aria-label "Edit story" — there are N edit buttons
    // (one per story); pick the one inside the matching story row.
    const row = document.querySelector(`[data-story-id="${fixture.editStoryId}"]`);
    if (row) {
      const editBtn = row.querySelector('button[aria-label="Edit story"]');
      if (editBtn && editBtn instanceof HTMLElement) {
        editBtn.click();
      }
    }
  }
}

export default function StoryBankPreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture = STORYBANK_FIXTURES[state] || STORYBANK_FIXTURES["storybank-populated"];

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
      user: { id: STORYBANK_FIXTURE_UID, email: "eli@example.com" },
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

  // Post-mount DOM actions. Declared BEFORE the conditional Navigate
  // return so hook order stays stable across the redirect re-render
  // (Tracker lesson).
  useEffect(() => {
    const hasDomAction =
      fixture.expandStoryId ||
      fixture.deleteConfirmStoryId ||
      fixture.openAddDialog ||
      fixture.editStoryId;
    if (!hasDomAction) return;
    const t1 = setTimeout(() => {
      applyDomActions(fixture);
      // Second pass after the initial click in case the row mounted
      // late or the dialog needs an extra tick to settle.
      setTimeout(() => applyDomActions(fixture), 120);
    }, 90);
    return () => clearTimeout(t1);
  }, [fixture]);

  // Apply the fixture's URL flag synchronously via React Router so
  // useSearchParams() inside StoryBank sees it on first render. Same
  // pattern as Tracker/Profile/Roadmap.
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
          <StoryBank />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
