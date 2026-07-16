// DEV-only standalone preview of a proposed 3-tab homepage layout at
// /_preview/home-3tab: Tracker | CV | Browse Jobs. Demo/prototype for
// review - does NOT touch the live /Career route. Runs inside the real
// Layout with the real AuthProvider + QueryClient (same pattern as
// CVAgentLivePreview) - no stubbed data, no fixture seeding.
//
// Tracker tab lifts the pipeline block Career.jsx renders under
// ?pipeline=open (RdFunnelTile x4, dismissible guide, ApplicationsKanban,
// ApplicationDetailDrawer, AddApplicationDialog) and swaps the URL-param
// state (boardOpen / searchParams) for this shell's own useState - the
// applications query + cache key stay identical so this tab reads/writes
// the exact same data Career's Pipeline tab and the old Tracker page did.
// The TRACKER_CSS/.tk-* injection Career.jsx still carries is dropped here:
// grepping the whole tracker component tree found zero `.tk-*` class
// references outside trackerStyles.js itself - PR 3E finished migrating
// every tracker subcomponent to --rd-* tokens, so the injection is dead
// weight (see PR body / investigation notes for this branch).
//
// Browse Jobs tab mounts <UnifiedJobsFeed/> directly - it's already
// self-fetching and page-agnostic (the same component /Career's "Job
// search" tab and the retired /Jobs route both render).

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Star,
  Briefcase,
  X,
  Columns3,
  FileUser,
  Compass,
} from "lucide-react";
import Layout from "@/Layout";
import RdCard from "@/components/redesign/RdCard";
import RdFunnelTile from "@/components/redesign/RdFunnelTile";
import UnifiedJobsFeed from "@/components/jobs/UnifiedJobsFeed";
import ApplicationsKanban from "@/components/tracker/ApplicationsKanban";
import ApplicationDetailDrawer from "@/components/tracker/ApplicationDetailDrawer";
import AddApplicationDialog from "@/components/tracker/AddApplicationDialog";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { funnelCountsFromApplications } from "@/lib/funnelBuckets";
import Home3TabCvTab from "./Home3TabCvTab";
import { CANVAS_FIXTURES } from "./canvas/canvasConfig";
import { CANVAS_APPLICATIONS } from "./fixtures/canvasHome";
import CanvasKanban from "./canvas/CanvasKanban";
import CanvasFunnelTile from "./canvas/CanvasFunnelTile";
import CanvasAppDrawer from "./canvas/CanvasAppDrawer";
import { CanvasJobsFeed } from "./canvas/CanvasMatches";
import CanvasSidebar from "./canvas/CanvasSidebar";
import { CvGenProvider } from "./canvas/CvGenContext";
import CanvasField from "./canvas/CanvasField";
import CanvasLayoutSwitcher from "./canvas/CanvasLayoutSwitcher";
import { applyPalette } from "./canvas/palette";
import "./canvas/scale.css";
import "./canvas/elevation.css";
import "./canvas/toolkit.css";

const APPLICATION_STATUSES = [
  "interested",
  "preparing",
  "applied",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
];
const APPLICATION_STATUS_LABELS = {
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
};

const GUIDE_DISMISS_KEY = (uid) => `home3tabPipelineGuideDismissed:${uid}`;

// One coherent lucide family. Tracker/Browse icons are shared with their
// sidebar tiles (same concept → same glyph); CV uses FileUser (a résumé) to
// stay distinct from the CV-bank tile's FileStack. Coral is the only accent.
const TABS = [
  { id: "cv", label: "CV", icon: FileUser },
  { id: "tracker", label: "Tracker", icon: Columns3 },
  { id: "jobs", label: "Browse Jobs", icon: Compass },
];

export default function Home3TabPreview() {
  const [activeTab, setActiveTab] = useState("cv");
  // Clay is the adopted palette (hue exploration final). Applied once on mount to
  // the document root so portaled overlays inherit; restored on unmount.
  useEffect(() => (CANVAS_FIXTURES ? applyPalette() : undefined), []);

  // Animated tab indicator: one underline that slides under the active tab
  // (measured, hand-rolled — no framer). Recomputed on tab change + resize.
  const tabRefs = useRef({});
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false });
  const measureTab = () => {
    const el = tabRefs.current[activeTab];
    if (el)
      setInd({
        left: el.offsetLeft + 8,
        width: el.offsetWidth - 16,
        ready: true,
      });
  };
  useLayoutEffect(measureTab, [activeTab]);
  useEffect(() => {
    window.addEventListener("resize", measureTab);
    return () => window.removeEventListener("resize", measureTab);
  }, [activeTab]);

  return (
    <Layout currentPageName="Career">
      <CvGenProvider onStart={() => setActiveTab("cv")}>
        <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 py-5 h-[100dvh] overflow-hidden flex flex-col min-h-0">
          {CANVAS_FIXTURES && <CanvasField />}
          {CANVAS_FIXTURES && <CanvasLayoutSwitcher />}
          <div className="mb-1">
            <p className="rd-t-micro uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
              {CANVAS_FIXTURES
                ? "Design canvas · fixture data · safe to click"
                : "Prototype - not the live homepage"}
            </p>
            <h1 className="font-display font-extrabold rd-t-display-m text-rd-text mt-0.5">
              Home
            </h1>
          </div>

          <div
            className="relative flex items-center justify-center gap-1 mt-3 border-b border-rd-border"
            role="tablist"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (tabRefs.current[tab.id] = el)}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 font-display font-bold rd-t-body-m transition-colors ${
                    active
                      ? "text-rd-text"
                      : "text-rd-text-secondary hover:text-rd-text"
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
            {/* One sliding underline (animated tab indicator). */}
            <span
              aria-hidden="true"
              className="absolute left-0 -bottom-px h-[2px] bg-rd-coral rounded-full transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
              style={{
                transform: `translateX(${ind.left}px)`,
                width: ind.width,
                opacity: ind.ready ? 1 : 0,
              }}
            />
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-4">
            {/* Persistent sidebar — toolkit rail + coach, mounted across tabs */}
            <CanvasSidebar />

            {/* App-shell: no page scroll. Desktop → each column scrolls
                internally (overflow-hidden here). Mobile (stacked) → this is the
                single internal scroller; pb clears the fixed bottom rail. */}
            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto md:overflow-hidden pb-16 md:pb-0">
              {activeTab === "cv" && <Home3TabCvTab />}
              {activeTab === "tracker" &&
                (CANVAS_FIXTURES ? <CanvasTrackerTab /> : <TrackerTab />)}
              {activeTab === "jobs" &&
                (CANVAS_FIXTURES ? <CanvasJobsFeed /> : <UnifiedJobsFeed />)}
            </div>
          </div>
        </div>
      </CvGenProvider>
    </Layout>
  );
}

// ───── Tracker tab - lifted pipeline block from Career.jsx ─────

function TrackerTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useProfileQuery(user?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [drawerAppId, setDrawerAppId] = useState(null);

  const guideDismissKey = user?.id ? GUIDE_DISMISS_KEY(user.id) : null;
  const [guideDismissed, setGuideDismissed] = useState(() => {
    if (!guideDismissKey) return false;
    try {
      return localStorage.getItem(guideDismissKey) === "1";
    } catch {
      return false;
    }
  });
  const dismissGuide = () => {
    setGuideDismissed(true);
    try {
      if (guideDismissKey) localStorage.setItem(guideDismissKey, "1");
    } catch {
      /* localStorage unavailable */
    }
  };

  // Same canonical wide query + key Career/Home/old-Tracker all share.
  const { data: applications = [] } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const funnelCounts = useMemo(
    () => funnelCountsFromApplications(applications),
    [applications],
  );

  const atsLinkedKeys = useMemo(
    () =>
      applications
        .filter((a) => a.ats_source && a.external_id)
        .map((a) => ({ ats: a.ats_source, ext: a.external_id })),
    [applications],
  );
  const { data: inactiveExternalIds = new Set() } = useQuery({
    queryKey: ["trackedJobsActiveStatus", user?.id, atsLinkedKeys.length],
    queryFn: async () => {
      if (atsLinkedKeys.length === 0) return new Set();
      const inactive = new Set();
      const byAts = atsLinkedKeys.reduce((acc, k) => {
        (acc[k.ats] = acc[k.ats] || []).push(k.ext);
        return acc;
      }, {});
      for (const [ats, ids] of Object.entries(byAts)) {
        const { data, error } = await supabase
          .from("jobs")
          .select("external_id")
          .eq("ats_source", ats)
          .in("external_id", ids)
          .eq("is_active", false);
        if (error) {
          console.warn(
            "[home-3tab-preview] inactive cross-ref failed:",
            error.message,
          );
          continue;
        }
        for (const j of data || []) inactive.add(`${ats}|${j.external_id}`);
      }
      return inactive;
    },
    enabled: !!user?.id && atsLinkedKeys.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const drawerApp = useMemo(
    () => (drawerAppId ? applications.find((a) => a.id === drawerAppId) : null),
    [drawerAppId, applications],
  );
  const drawerListingInactive =
    drawerApp && drawerApp.ats_source && drawerApp.external_id
      ? inactiveExternalIds.has(
          `${drawerApp.ats_source}|${drawerApp.external_id}`,
        )
      : false;

  return (
    <section aria-label="Pipeline board">
      <div className="flex gap-1.5 mb-4">
        <RdFunnelTile label="saved" value={funnelCounts.saved} tone="neutral" />
        <RdFunnelTile
          label="applied"
          value={funnelCounts.applied}
          tone="neutral"
        />
        <RdFunnelTile
          label="interview"
          value={funnelCounts.interview}
          tone="teal"
        />
        <RdFunnelTile label="offer" value={funnelCounts.offer} tone="neutral" />
      </div>

      {!guideDismissed && (
        <RdCard className="p-5" data-pipeline-guide>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="rd-t-micro uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                How to use this pipeline
              </p>
              <p className="rd-t-body-m text-rd-text-secondary leading-[1.55] mt-1.5">
                Every application has a{" "}
                <strong className="text-rd-text font-display font-bold">
                  7-step process
                </strong>
                . Open any application and go to the{" "}
                <strong className="text-rd-text font-display font-bold">
                  📋 Steps
                </strong>{" "}
                tab. Work through each step before submitting - candidates who
                skip steps are the ones who get ignored.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissGuide}
              aria-label="Dismiss the pipeline guide"
              className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
            <PipelineGuideTile
              tint="var(--rd-coral-tint)"
              accent="var(--rd-coral-dark)"
              head="Steps 1–2"
              body="Qualify yourself. Dissect the job description. Know the role before applying."
            />
            <PipelineGuideTile
              tint="var(--rd-teal-tint)"
              accent="var(--rd-teal-dark)"
              head="Steps 3–5"
              body="Tailor your CV, map skill evidence, and find a referral contact at the company."
            />
            <PipelineGuideTile
              tint="var(--rd-coral-tint)"
              accent="var(--rd-coral-dark)"
              head="Steps 6–7"
              body="Submit your application, then prep for the interview with STAR-format answers."
            />
            <PipelineGuideTile
              tint="var(--rd-coral-tint)"
              accent="var(--rd-coral-dark)"
              head="⭐ Referral = your biggest edge"
              body="Many companies offer referral bonuses to employees when a referred candidate gets hired. They're incentivised to get you in."
              highlight
            />
          </div>
        </RdCard>
      )}

      <div
        className={`flex items-start justify-between gap-3 flex-wrap ${!guideDismissed ? "mt-4" : ""}`}
      >
        <div className="min-w-0">
          <h2 className="font-display font-bold rd-t-display-s text-rd-text">
            Pipeline board
          </h2>
          <p className="rd-t-body-s text-rd-text-secondary mt-0.5">
            Drag a card between columns to update its status. Click any card to
            open the steps checklist.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold rd-t-body-s text-white bg-rd-teal hover:bg-rd-teal-dark rounded-full px-3.5 py-2 rd-press rd-btn-sheen"
        >
          <Plus className="w-3.5 h-3.5" />
          Add manually
        </button>
      </div>

      <div className="mt-3">
        {applications.length === 0 ? (
          <RdCard className="px-6 py-10 text-center">
            <Briefcase className="w-10 h-10 text-rd-teal mx-auto mb-3" />
            <p className="rd-t-body-m text-rd-text-secondary leading-[1.55] max-w-md mx-auto">
              No applications yet. Track one from the Browse Jobs tab - the
              Track button on any role card prepends it here.
            </p>
          </RdCard>
        ) : (
          <ApplicationsKanban
            applications={applications}
            statuses={APPLICATION_STATUSES}
            statusLabels={APPLICATION_STATUS_LABELS}
            inactiveExternalIds={inactiveExternalIds}
            onCardClick={(app) => setDrawerAppId(app.id)}
          />
        )}
      </div>

      <ApplicationDetailDrawer
        app={drawerApp}
        profile={profile}
        listingInactive={drawerListingInactive}
        open={!!drawerApp}
        onClose={() => setDrawerAppId(null)}
        onUpdate={() =>
          queryClient.invalidateQueries({ queryKey: ["applications"] })
        }
      />

      <AddApplicationDialog open={showAdd} onOpenChange={setShowAdd} />
    </section>
  );
}

// ───── Fixture-mode Tracker tab — same design as TrackerTab, but reads
// CANVAS_APPLICATIONS and mutates LOCAL state (drag, add) with zero DB. ─────

function CanvasTrackerTab() {
  const [apps, setApps] = useState(CANVAS_APPLICATIONS);
  const [drawerApp, setDrawerApp] = useState(null);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [justMoved, setJustMoved] = useState(null); // card id → settle beat

  const funnelCounts = useMemo(
    () => funnelCountsFromApplications(apps),
    [apps],
  );

  const move = (appId, toStatus) => {
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: toStatus } : a)),
    );
    setJustMoved(appId);
    setTimeout(() => setJustMoved((id) => (id === appId ? null : id)), 500);
  };

  const addManually = () =>
    setApps((prev) => [
      {
        id: `cx-local-${prev.length + 1}`,
        status: "interested",
        company: "New company",
        role_title: "New saved role",
        location: "Tel Aviv",
        qualification_score: null,
        date_applied: null,
        note: "",
      },
      ...prev,
    ]);

  return (
    <section
      aria-label="Pipeline board"
      className="md:h-full flex flex-col md:min-h-0"
    >
      <div className="flex gap-1.5 mb-4 flex-shrink-0">
        <CanvasFunnelTile
          label="saved"
          value={funnelCounts.saved}
          total={apps.length}
        />
        <CanvasFunnelTile
          label="applied"
          value={funnelCounts.applied}
          total={apps.length}
        />
        <CanvasFunnelTile
          label="interview"
          value={funnelCounts.interview}
          total={apps.length}
        />
        <CanvasFunnelTile
          label="offer"
          value={funnelCounts.offer}
          total={apps.length}
          accent="var(--rd-teal)"
        />
      </div>

      {/* Guide + board scroll inside their own container on desktop; the funnel
          row above stays pinned. Mobile uses the page's single scroller. */}
      <div className="cx-fade-y md:flex-1 md:min-h-0 md:overflow-y-auto md:pb-2">
        {!guideDismissed && (
          <div className="rd-lift rd-r-lg p-5" data-pipeline-guide>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="rd-t-micro uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                  How to use this pipeline
                </p>
                <p className="rd-t-body-m text-rd-text-secondary leading-[1.55] mt-1.5">
                  Every application has a{" "}
                  <strong className="text-rd-text font-display font-bold">
                    7-step process
                  </strong>
                  . Open any card and work through each step before submitting -
                  candidates who skip steps are the ones who get ignored.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuideDismissed(true)}
                aria-label="Dismiss the pipeline guide"
                className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
              <PipelineGuideTile
                tint="var(--rd-coral-tint)"
                accent="var(--rd-coral-dark)"
                head="Steps 1–2"
                body="Qualify yourself. Dissect the job description. Know the role before applying."
              />
              <PipelineGuideTile
                tint="var(--rd-teal-tint)"
                accent="var(--rd-teal-dark)"
                head="Steps 3–5"
                body="Tailor your CV, map skill evidence, and find a referral contact at the company."
              />
              <PipelineGuideTile
                tint="var(--rd-coral-tint)"
                accent="var(--rd-coral-dark)"
                head="Steps 6–7"
                body="Submit your application, then prep for the interview with STAR-format answers."
              />
              <PipelineGuideTile
                tint="var(--rd-coral-tint)"
                accent="var(--rd-coral-dark)"
                head="⭐ Referral = your biggest edge"
                body="Many companies offer referral bonuses. They're incentivised to get you in."
                highlight
              />
            </div>
          </div>
        )}

        <div
          className={`flex items-start justify-between gap-3 flex-wrap ${!guideDismissed ? "mt-4" : ""}`}
        >
          <div className="min-w-0">
            <h2 className="font-display font-bold rd-t-display-s text-rd-text">
              Pipeline board
            </h2>
            <p className="rd-t-body-s text-rd-text-secondary mt-0.5">
              Drag a card between columns to update its status. Click any card
              to open the steps checklist.
            </p>
          </div>
          <button
            type="button"
            onClick={addManually}
            className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold rd-t-body-s text-white bg-rd-teal hover:bg-rd-teal-dark rounded-full px-3.5 py-2 rd-press rd-btn-sheen"
          >
            <Plus className="w-3.5 h-3.5" />
            Add manually
          </button>
        </div>

        <div className="mt-3">
          <CanvasKanban
            applications={apps}
            statuses={APPLICATION_STATUSES}
            statusLabels={APPLICATION_STATUS_LABELS}
            onMove={move}
            onCardClick={(app) => setDrawerApp(app)}
            justMoved={justMoved}
          />
        </div>
      </div>

      <CanvasAppDrawer app={drawerApp} onClose={() => setDrawerApp(null)} />
    </section>
  );
}

function PipelineGuideTile({ tint, accent, head, body, highlight = false }) {
  return (
    <div className="rd-r-md px-3.5 py-3" style={{ background: tint }}>
      <p
        className="font-display font-bold rd-t-body-s leading-tight inline-flex items-center gap-1.5"
        style={{ color: accent }}
      >
        {highlight && <Star className="w-3 h-3" aria-hidden="true" />}
        {head}
      </p>
      <p
        className="rd-t-body-s leading-[1.45] mt-1.5"
        style={{ color: accent }}
      >
        {body}
      </p>
    </div>
  );
}
