// Tasks preview harness — DEV-only route at /_preview/tasks/:state.
//
// Wraps the real Tasks page in a fresh QueryClient seeded on the 3
// canonical Tasks-tree query keys, plus a stub AuthContext.
// Synchronous seed inside useMemo per the established pattern
// (Tracker, Profile, StoryBank).
//
// Each fixture can carry:
//   - filter: pre-select a category filter via post-mount DOM click
//     (filter state lives in local useState inside Tasks.jsx)
//   - editDateForTaskId: open the inline date picker on a specific row
//     via post-mount DOM click on its "Add/Change due date" button
//   - generateError: pre-set the generate-error banner. There's no
//     prop hook for this; the harness fakes it by triggering the same
//     state path via a deliberate-failure stub of the edge function +
//     a manual button click. Implemented as a localStorage hatch the
//     fixture sets, NOT as a production-code change.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/tasks/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Tasks from "@/pages/Tasks";
import { TASKS_FIXTURES, TASKS_FIXTURE_UID } from "./fixtures/tasks";

function seedCache(qc, fixture) {
  // Loading state = omit the tasks seed so the query stays in `fetching`
  // and Tasks.jsx's `loadingTasks` flag drives the spinner.
  if (!fixture.loading) {
    qc.setQueryData(["tasks", TASKS_FIXTURE_UID], fixture.tasks ?? []);
  }
  qc.setQueryData(["userProfile", TASKS_FIXTURE_UID], fixture.profile ?? null);
  qc.setQueryData(["careerRoles", TASKS_FIXTURE_UID], fixture.roles ?? []);
}

// Post-mount DOM driver. The filter pill / edit-date-button / error
// banner all live in local useState inside Tasks.jsx — the only way to
// drive them from outside is a click (or, for the generate-error
// banner, a fake failure path that produces the same state).
function applyDomActions(fixture) {
  if (fixture.filter) {
    const buttons = Array.from(document.querySelectorAll('button[aria-pressed]'));
    const labelByCat = {
      skill: "Skill gap",
      project: "Project",
      networking: "Networking",
      cv: "CV",
      application: "Application",
    };
    const target = labelByCat[fixture.filter];
    if (target) {
      const match = buttons.find((b) => b.textContent?.trim() === target);
      if (match && match instanceof HTMLElement && match.getAttribute("aria-pressed") !== "true") {
        match.click();
      }
    }
  }
  if (fixture.editDateForTaskId) {
    const btn = document.querySelector(`button[data-task-edit-date="${fixture.editDateForTaskId}"]`);
    if (btn && btn instanceof HTMLElement) {
      btn.click();
    }
  }
  if (fixture.generateError) {
    // Drive the error banner by writing directly into Tasks.jsx's error
    // useState via a global stub. Tasks.jsx doesn't accept an error prop;
    // the simplest preview-only path is to click "Generate tasks" once
    // (which is gated to require !profile.onboarding_complete in some
    // branches but always tries the edge fn) and let the edge-fn call
    // fail in DEV mode. Since DEV's vite dev server has no Supabase
    // edge functions wired, the invoke() naturally fails and we render
    // the same banner. This is the cleanest approach — no production
    // shim required.
    const buttons = Array.from(document.querySelectorAll("button"));
    const generateBtn = buttons.find((b) => b.textContent?.trim() === "Generate tasks");
    if (generateBtn && generateBtn instanceof HTMLElement) {
      generateBtn.click();
    }
  }
}

export default function TasksPreview() {
  const { state } = useParams();
  const fixture = TASKS_FIXTURES[state] || TASKS_FIXTURES["tasks-populated"];

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
      user: { id: TASKS_FIXTURE_UID, email: "eli@example.com" },
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

  // Post-mount DOM actions. Tasks doesn't have URL-driven view state
  // (no ?filter= URL param), so all view-state flags are DOM-clicked.
  useEffect(() => {
    const hasDomAction =
      fixture.filter || fixture.editDateForTaskId || fixture.generateError;
    if (!hasDomAction) return;
    const t1 = setTimeout(() => {
      applyDomActions(fixture);
      // Second pass for late-mounted UI (e.g. date picker after first
      // click renders).
      setTimeout(() => applyDomActions(fixture), 120);
    }, 90);
    return () => clearTimeout(t1);
  }, [fixture]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
          <Tasks />
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
