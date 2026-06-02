// Calendar preview harness — DEV-only route at /_preview/calendar/:state.
//
// Wraps the real Calendar in a fresh QueryClient seeded on the 3
// canonical Calendar-tree query keys, plus a stub AuthContext.
// Synchronous seed inside useMemo per the established pattern.
//
// Each fixture can carry:
//   - viewMode: "week" | "day" — post-mount DOM click on the mode pill
//     (Calendar's viewMode state is local useState, not URL-driven)
//   - openAddDialog: true — post-mount click on "Add event" button
//   - eventsError: true — drives the error banner. There's no prop hook
//     for this; the harness pretends by NOT seeding the calendarEvents
//     query AND wiring it to fail. The simplest reliable path is to
//     seed an empty array and assume the banner only renders on actual
//     supabase errors. The fixture flag is therefore best-effort —
//     the screenshot captures the empty state for this fixture.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/calendar/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Calendar from "@/pages/Calendar";
import { CALENDAR_FIXTURES, CALENDAR_FIXTURE_UID } from "./fixtures/calendar";

function seedCache(qc, fixture) {
  // Loading state = omit ALL three seeds so the three queries stay in
  // `fetching` and Calendar's `isLoading` flag drives the spinner.
  if (fixture.loading) return;

  // For the events-error fixture, seed `calendarEvents` with a
  // rejected promise so the query lands in `isError` instead of
  // `isSuccess`. setQueryData can't represent error state directly,
  // so we use setQueryState-style queue manipulation via the internal
  // cache. The cleaner approach: just set the query state via mutate.
  if (fixture.eventsError) {
    qc.setQueryData(["calendarEvents", CALENDAR_FIXTURE_UID], []);
    // Mark the query as errored. React Query v5 supports this via
    // queryClient.getQueryCache().find(...).setState({...}).
    const q = qc.getQueryCache().find({ queryKey: ["calendarEvents", CALENDAR_FIXTURE_UID] });
    if (q) {
      q.setState({
        ...q.state,
        status: "error",
        error: new Error("Could not load calendar events"),
        fetchStatus: "idle",
      });
    }
  } else {
    qc.setQueryData(["calendarEvents", CALENDAR_FIXTURE_UID], fixture.events ?? []);
  }
  qc.setQueryData(["applications", CALENDAR_FIXTURE_UID], fixture.applications ?? []);
  qc.setQueryData(["tasks", CALENDAR_FIXTURE_UID], fixture.tasks ?? []);
}

function applyDomActions(fixture) {
  if (fixture.viewMode && fixture.viewMode !== "month") {
    const btn = document.querySelector(`button[data-mode="${fixture.viewMode}"]`);
    if (btn && btn instanceof HTMLElement && btn.getAttribute("aria-pressed") !== "true") {
      btn.click();
    }
  }
  if (fixture.openAddDialog) {
    const buttons = Array.from(document.querySelectorAll("button"));
    const match = buttons.find((b) => b.textContent?.trim() === "Add event");
    if (match && match instanceof HTMLElement) {
      match.click();
    }
  }
}

export default function CalendarPreview() {
  const { state } = useParams();
  const fixture = CALENDAR_FIXTURES[state] || CALENDAR_FIXTURES["calendar-populated-month"];

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
      user: { id: CALENDAR_FIXTURE_UID, email: "eli@example.com" },
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

  useEffect(() => {
    const hasDomAction = (fixture.viewMode && fixture.viewMode !== "month") || fixture.openAddDialog;
    if (!hasDomAction) return;
    const t1 = setTimeout(() => {
      applyDomActions(fixture);
      setTimeout(() => applyDomActions(fixture), 120);
    }, 90);
    return () => clearTimeout(t1);
  }, [fixture]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
          <Calendar />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
