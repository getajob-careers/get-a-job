// Internship preview harness — DEV-only route at /_preview/internship/:state.
//
// Internship.jsx uses TanStack Query for `company_targets`, `internship_profile`,
// and `career_roles_latest_created_at`. The harness pre-seeds the queryClient
// with the fixture's data. Direct supabase reads (status_changes timeline in
// CompanyTargetDrawer, profiles via useProfileQuery) go through a fetch
// override.
//
// 5 fixtures (see fixtures/internship.js):
//   1. populated-kanban  — full board across 6 statuses
//   2. add-own-modal     — AddOwnCompanyModal mounted standalone
//   3. drawer-open       — CompanyTargetDrawer mounted standalone w/ seeded target
//   4. match-result      — FindCompaniesCard + populated kanban
//   5. empty-pipeline    — InternshipStartHere visible
//
// DnD drag itself is interactive and cannot be captured statically. The PDF
// captures board STATES (positions of cards in columns); the drag animation
// must be smoke-tested on prod.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/internship/* falls through to
// AuthenticatedApp → /login.

import React, { useMemo, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Internship from "@/pages/Internship";
import AddOwnCompanyModal from "@/components/internship/AddOwnCompanyModal";
import CompanyTargetDrawer from "@/components/internship/CompanyTargetDrawer";
import {
  INTERNSHIP_FIXTURES,
  INTERNSHIP_FIXTURE_UID,
} from "./fixtures/internship";

function seedCache(qc, fixture) {
  qc.setQueryData(["userProfile", INTERNSHIP_FIXTURE_UID], fixture.profile ?? null);
  qc.setQueryData(["profile", INTERNSHIP_FIXTURE_UID], fixture.profile ?? null);
  qc.setQueryData(["company_targets", INTERNSHIP_FIXTURE_UID], fixture.targets ?? []);
  qc.setQueryData(["internship_profile", INTERNSHIP_FIXTURE_UID], fixture.internshipProfile ?? null);
  qc.setQueryData(["career_roles_latest_created_at", INTERNSHIP_FIXTURE_UID], null);
  // Pre-seed status_changes per target so the drawer Timeline renders.
  for (const t of fixture.targets ?? []) {
    const tChanges = (fixture.statusChanges ?? []).filter((s) => s.target_id === t.id);
    qc.setQueryData(["company_target_status_changes", t.id], tChanges);
  }
  // Browse-tab fixture: seed the companies_browse list so the grid
  // renders populated cards instead of an empty state.
  const browseCompanies = (fixture.targets ?? [])
    .map((t) => t.companies)
    .filter(Boolean)
    .map((c) => ({
      ...c,
      origin: c.origin || "registry",
      ats: c.ats || null,
      verified: c.verified ?? true,
    }));
  qc.setQueryData(["companies_browse"], browseCompanies);
}

function installFetchOverride(fixture) {
  const real = window.fetch;
  window.fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input || "");

    if (url.includes("/rest/v1/profiles")) {
      return jsonResponse([fixture.profile ?? null]);
    }
    if (url.includes("/rest/v1/internship_profiles")) {
      return jsonResponse(fixture.internshipProfile ? [fixture.internshipProfile] : []);
    }
    if (url.includes("/rest/v1/company_targets")) {
      return jsonResponse(fixture.targets ?? []);
    }
    if (url.includes("/rest/v1/company_target_status_changes")) {
      return jsonResponse(fixture.statusChanges ?? []);
    }
    if (url.includes("/rest/v1/career_roles")) {
      return jsonResponse([]);
    }
    if (url.includes("/rest/v1/companies")) {
      const all = (fixture.targets ?? []).map((t) => t.companies).filter(Boolean);
      return jsonResponse(all);
    }
    // Edge functions — no-op stubs.
    if (url.includes("/functions/v1/match-internship-companies")) {
      return jsonResponse({ matched: 5, top_targets: [{ name: "Tomorrow.fin" }] });
    }
    if (url.includes("/functions/v1/generate-internship-profile")) {
      return jsonResponse({ internship_profile: fixture.internshipProfile });
    }
    if (url.includes("/functions/v1/generate-internship-pitch")) {
      return jsonResponse({
        pitch: {
          pitched_role: "Product Analyst Intern",
          pitch_rationale:
            "Guardio activation work maps cleanly to the company's adoption-funnel focus. Reichman alumni network gives a warm referral path.",
          who_to_contact: ["Sarah Cohen (Director of CS)", "Maya Levi (PM Lead)"],
          skill_gaps_this_fills: ["Activation analytics", "Funnel instrumentation"],
        },
      });
    }
    return real(input, init);
  };
  return () => {
    window.fetch = real;
  };
}

function jsonResponse(body, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

// ── AddOwnCompanyModal subtree — standalone modal render ─────────
function AddOwnSubtree() {
  const [open] = useState(true);
  return (
    <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">Internship</p>
        <h1 className="font-display font-extrabold text-[27px] sm:text-[32px] leading-[1.08] tracking-tight text-rd-text mt-1.5">
          Track your internship pipeline.
        </h1>
        <p className="text-rd-text-secondary mt-3 text-[14.5px]">
          The Add-own-company modal renders on top of the live page. Subtree
          mode pins it open for the PDF capture.
        </p>
      </div>
      <AddOwnCompanyModal open={open} onClose={() => {}} />
    </div>
  );
}

// ── CompanyTargetDrawer subtree — standalone right-rail render ──
function DrawerSubtree({ fixture }) {
  const targetId = fixture.drawerTargetId;
  const seededTarget = (fixture.targets || []).find((t) => t.id === targetId) || (fixture.targets || [])[0];
  return (
    <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">Internship</p>
        <h1 className="font-display font-extrabold text-[27px] sm:text-[32px] leading-[1.08] tracking-tight text-rd-text mt-1.5">
          {seededTarget?.companies?.name || "Company drawer"}
        </h1>
        <p className="text-rd-text-secondary mt-3 text-[14.5px]">
          CompanyTargetDrawer rendered standalone with seeded target + status_changes.
        </p>
      </div>
      <CompanyTargetDrawer target={seededTarget} open={true} onClose={() => {}} />
    </div>
  );
}

export default function InternshipPreview() {
  const { state } = useParams();
  const [searchParams] = useSearchParams();
  const fixture =
    INTERNSHIP_FIXTURES[state] || INTERNSHIP_FIXTURES["internship-populated-kanban"];

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

  const cleanupRef = useRef(null);
  useEffect(() => {
    const cleanup = installFetchOverride(fixture);
    cleanupRef.current = cleanup;
    return () => {
      if (typeof cleanupRef.current === "function") cleanupRef.current();
    };
  }, [fixture]);

  const authValue = useMemo(
    () => ({
      user: { id: INTERNSHIP_FIXTURE_UID, email: "eli@example.com" },
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

  // Pin ?tab= when the fixture requests a non-default tab (browse).
  // Internship.jsx defaults to ?tab=pipeline; explicit ?tab=browse
  // is what surfaces CompanyBrowsePanel.
  const targetTab = fixture.tab || "pipeline";
  const subtreeFixture = !!fixture.subtreeOnly;
  if (!subtreeFixture && searchParams.get("tab") !== targetTab) {
    return <Navigate to={`?tab=${targetTab}`} replace />;
  }

  if (fixture.subtreeOnly === "add-own-modal") {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <AddOwnSubtree />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  if (fixture.subtreeOnly === "drawer-open") {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <DrawerSubtree fixture={fixture} />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Internship />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
