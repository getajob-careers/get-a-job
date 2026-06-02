// Tracker preview harness — DEV-only route at /_preview/tracker/:state.
//
// Wraps the real Tracker in a fresh QueryClient seeded on the canonical
// applications + trackedJobsActiveStatus keys, plus a stub AuthContext.
// Synchronous seed inside useMemo per the established pattern (Roadmap,
// Home, Jobs).
//
// Each fixture can carry a URL flag (filter / expand / tab / add). The
// harness applies it via React Router's <Navigate replace> so
// useSearchParams reads it on first render. A small post-mount effect
// then drives the page's internal state — filter pill click, row expand
// click, tab click, Add dialog open — via DOM events. Tracker's filter
// pill / row expand / tab / Add are all in local useState (not URL-
// driven), so the post-mount click is the only way to drive them
// without modifying production code.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/tracker/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Tracker from "@/pages/Tracker";
import { TRACKER_FIXTURES, TRACKER_FIXTURE_UID } from "./fixtures/tracker";

function seedCache(qc, fixture) {
  // Seed the page's two queries. The applications query is keyed
  // [uid] alone. The trackedJobsActiveStatus query is keyed
  // [uid, atsLinkedKeys.length] — atsLinkedKeys is computed inside
  // Tracker as a useMemo over applications.filter(a => ats_source &&
  // external_id). Whichever count that resolves to is the key the
  // query reads, so we have to seed against the EXACT count or it
  // misses and fires a real network call.
  qc.setQueryData(["userProfile", TRACKER_FIXTURE_UID], fixture.profile ?? null);

  if (fixture.loading) {
    // Loading state — don't seed applications. The query will be in
    // its initial "fetching" state because no data was placed in the
    // cache. Tracker.jsx's `isLoading` then drives the skeleton.
  } else {
    qc.setQueryData(
      ["applications", TRACKER_FIXTURE_UID],
      fixture.applications ?? [],
    );
  }

  // Seed the inactive cross-ref under every count the harness might
  // resolve to. Cheap, safe, and avoids the "computed key resolved
  // differently than expected" miss.
  const linkedCount = (fixture.applications ?? []).filter(
    (a) => a.ats_source && a.external_id,
  ).length;
  qc.setQueryData(
    ["trackedJobsActiveStatus", TRACKER_FIXTURE_UID, linkedCount],
    fixture.inactive ?? new Set(),
  );
}

// Post-mount DOM driver. Tracker's filter pill / row expand / tab /
// Add dialog all live in local useState, so the only way to drive
// them from outside is by clicking the corresponding buttons.
function applyUrlActions(searchParams) {
  const filter = searchParams.get("filter");
  const expand = searchParams.get("expand");
  const tab = searchParams.get("tab");
  const add = searchParams.get("add");

  if (filter) {
    const target = filter.charAt(0).toUpperCase() + filter.slice(1);
    const buttons = Array.from(
      document.querySelectorAll("button[aria-pressed]"),
    );
    const match = buttons.find((b) => b.textContent?.trim() === target);
    if (match && match instanceof HTMLElement && match.getAttribute("aria-pressed") !== "true") {
      match.click();
    }
  }

  if (expand) {
    const row = document.querySelector(`button[data-app-id="${expand}"]`);
    if (row && row instanceof HTMLElement && row.getAttribute("aria-expanded") !== "true") {
      row.click();
    }
  }

  if (tab) {
    // Tab labels (matching the live ApplicationRow tabs config).
    const tabLabels = {
      checklist:   "📋 Steps",
      target:      "Target role",
      cv:          "CV",
      skills:      "Skills",
      projects:    "Projects",
      networking:  "Networking",
      application: "Application",
      interview:   "Interview",
      followup:    "Follow-up",
    };
    const label = tabLabels[tab];
    if (label) {
      const tabs = Array.from(
        document.querySelectorAll('button[aria-selected]'),
      );
      const match = tabs.find((t) => t.textContent?.trim().includes(label));
      if (match && match instanceof HTMLElement && match.getAttribute("aria-selected") !== "true") {
        match.click();
      }
    }
  }

  if (add) {
    const buttons = Array.from(document.querySelectorAll("button"));
    const match = buttons.find((b) =>
      b.textContent?.trim() === "Add application",
    );
    if (match && match instanceof HTMLElement) {
      match.click();
    }
  }
}

export default function TrackerPreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture = TRACKER_FIXTURES[state] || TRACKER_FIXTURES["tracker-populated"];

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
      user: { id: TRACKER_FIXTURE_UID, email: "eli@example.com" },
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
  // the redirect re-render.
  useEffect(() => {
    if (!fixture.urlFlag) return;
    // Two ticks of grace for Tracker to mount, applications to render,
    // and ApplicationRow buttons to attach.
    const t1 = setTimeout(() => {
      applyUrlActions(searchParams);
      // Tab clicks require the row to be expanded first; do a second
      // pass after the row has rendered its tab bar.
      setTimeout(() => applyUrlActions(searchParams), 120);
    }, 80);
    return () => clearTimeout(t1);
  }, [fixture.urlFlag, searchParams]);

  // Apply the fixture's URL flag synchronously via React Router so
  // useSearchParams() inside Tracker sees it on first render. Same
  // pattern as Roadmap/Jobs.
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
          <Tracker />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
