// DEV-only standalone preview of a proposed 3-tab homepage layout at
// /_preview/home-3tab: Tracker | CV | Browse Jobs. Demo/prototype for
// review - does NOT touch the live /Career route or Layout.jsx. Runs
// inside the real Layout with the real AuthProvider + QueryClient (same
// pattern as CVAgentLivePreview) - no fixture seeding, no stubbed auth.
//
// Revision 4 (this pass): reverted an in-progress "avoid coral, use teal/
// neutral instead" experiment across this whole branch back to the live
// app's real palette - Career.jsx and its components use --rd-coral as
// the actual primary accent (active-tab underline, "Add manually" CTA,
// the applied funnel tile, track_1's real color per TRACK_CONFIG, the
// real FacetChip/UnifiedTabButton active states, JobGridCard's focus
// ring). This demo now matches that instead of diverging from it. See
// each affected spot below for what changed back.
//
// Revision 3:
// - Top tab bar rebuilt as a full-width 3-column bar (was 3 tightly
//   grouped buttons with just an underline) - each tab now fills a third
//   of the row, active state gets a filled/tinted background + bolder
//   weight + larger icon, and a border separates the three segments.
//   (Rev 4: the fill is coral-tint, not teal-tint - see above.)
// - Browse Jobs tab no longer mounts the real <UnifiedJobsFeed/> - see
//   Home3TabJobsTab.jsx's header comment for why (empty-state fidelity,
//   same reasoning as the CV tab's mock content below).
//
// Revision 2:
// - Added a persistent left sidebar (Home3TabSidebar) that wraps all
//   three tabs - see that file's header comment, it is written to be
//   liftable into Layout.jsx later if this shape ships for real.
// - Centered the top tab bar (superseded by the full-width bar above).
// - Tracker tab now seeds a local, hardcoded set of example applications
//   instead of reading the real ["applications", user.id] query, so the
//   board never renders empty regardless of which account is reviewing
//   it. This is intentionally NOT wired through react-query under the
//   real query key - ApplicationsKanban's own optimistic-update path
//   writes to that key internally, and seeding fake data into the SAME
//   key the rest of the app reads would risk stale fake data leaking
//   into a real page (Home/Career) navigated to later in the same tab.
//   Plain useState avoids that entirely. Net effect: drag-and-drop is
//   cosmetic only here - a dropped mock card's Supabase update matches
//   zero real rows (harmless no-op) and the card visually settles back
//   to its origin column on the next render, since local state doesn't
//   change. Real accounts get the real behavior once this ships for
//   real off mock data.
//
// Tracker tab still lifts the pipeline block Career.jsx renders under
// ?pipeline=open (funnel tiles, dismissible guide, ApplicationsKanban,
// ApplicationDetailDrawer, AddApplicationDialog), with the URL-param
// state swapped for local useState. The TRACKER_CSS/.tk-* injection
// Career.jsx still carries is dropped here: grepping the whole tracker
// component tree found zero `.tk-*` class references outside
// trackerStyles.js itself - PR 3E finished migrating every tracker
// subcomponent to --rd-* tokens, so the injection is dead weight.
//
// Browse Jobs tab mounts Home3TabJobsTab - fixture-driven mock content,
// see that file's header comment.

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Star,
  Briefcase,
  X,
  KanbanSquare,
  FileText,
  Search,
} from "lucide-react";
import Layout from "@/Layout";
import RdCard from "@/components/redesign/RdCard";
import RdFunnelTile from "@/components/redesign/RdFunnelTile";
import ApplicationsKanban from "@/components/tracker/ApplicationsKanban";
import ApplicationDetailDrawer from "@/components/tracker/ApplicationDetailDrawer";
import AddApplicationDialog from "@/components/tracker/AddApplicationDialog";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { funnelCountsFromApplications } from "@/lib/funnelBuckets";
import Home3TabSidebar from "./Home3TabSidebar";
import Home3TabCvTab from "./Home3TabCvTab";
import Home3TabJobsTab from "./Home3TabJobsTab";

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

// Visual-only seed data - not real rows. A few examples spread across
// columns so the board never renders empty for a reviewer, regardless of
// which account they're signed in with.
const MOCK_APPLICATIONS = [
  {
    id: "mock-app-1",
    role_title: "Product Manager",
    company: "Wix",
    status: "interested",
    track: "track_1",
    qualification_score: 0.82,
    url: "https://example.com/jobs/wix-pm",
  },
  {
    id: "mock-app-2",
    role_title: "Business Analyst",
    company: "monday.com",
    status: "interested",
    track: "track_2",
    qualification_score: 0.65,
    url: null,
  },
  {
    id: "mock-app-3",
    role_title: "Strategy & Ops Associate",
    company: "Riskified",
    status: "preparing",
    track: "track_1",
    qualification_score: 0.74,
    url: "https://example.com/jobs/riskified-strategy",
  },
  {
    id: "mock-app-4",
    role_title: "Operations Coordinator",
    company: "Fiverr",
    status: "applied",
    track: "track_3",
    qualification_score: 0.58,
    url: null,
  },
  {
    id: "mock-app-5",
    role_title: "Product Analyst",
    company: "Lightricks",
    status: "interviewing",
    track: "track_1",
    qualification_score: 0.79,
    url: "https://example.com/jobs/lightricks-analyst",
  },
];

const GUIDE_DISMISS_KEY = (uid) => `home3tabPipelineGuideDismissed:${uid}`;

const TABS = [
  { id: "tracker", label: "Tracker", icon: KanbanSquare },
  { id: "cv", label: "CV", icon: FileText },
  { id: "jobs", label: "Browse Jobs", icon: Search },
];

export default function Home3TabPreview() {
  const [activeTab, setActiveTab] = useState("cv");

  return (
    <Layout currentPageName="Career">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 h-full flex flex-col min-h-0">
        <div className="mb-1">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Prototype - not the live homepage
          </p>
          <h1 className="font-display font-extrabold text-[20px] text-rd-text mt-0.5">
            Home
          </h1>
        </div>

        <div className="mt-4 flex-1 min-h-0 flex flex-col md:flex-row gap-4">
          <Home3TabSidebar onHome={() => setActiveTab("cv")} />

          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <div
              className="grid grid-cols-3 rounded-[14px] border border-rd-border overflow-hidden"
              role="tablist"
            >
              {TABS.map((tab, i) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 py-3 font-display text-[14px] transition-colors ${
                      i > 0 ? "border-l border-rd-border" : ""
                    } ${
                      active
                        ? "bg-rd-coral-tint text-rd-coral-dark font-extrabold"
                        : "bg-rd-bg-card text-rd-text-secondary font-semibold hover:bg-rd-bg-soft hover:text-rd-text"
                    }`}
                  >
                    <Icon
                      className={active ? "w-4.5 h-4.5" : "w-3.5 h-3.5"}
                      aria-hidden="true"
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex-1 min-h-0">
              {activeTab === "tracker" && <TrackerTab />}
              {activeTab === "cv" && <Home3TabCvTab />}
              {activeTab === "jobs" && <Home3TabJobsTab />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ───── Tracker tab - real ApplicationsKanban, seeded with mock data ─────

function TrackerTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useProfileQuery(user?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [drawerAppId, setDrawerAppId] = useState(null);
  const [applications] = useState(MOCK_APPLICATIONS);

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

  const funnelCounts = funnelCountsFromApplications(applications);

  const drawerApp = drawerAppId
    ? applications.find((a) => a.id === drawerAppId)
    : null;

  return (
    <section aria-label="Pipeline board">
      <div className="flex gap-1.5 mb-4">
        <RdFunnelTile label="saved" value={funnelCounts.saved} tone="neutral" />
        <RdFunnelTile
          label="applied"
          value={funnelCounts.applied}
          tone="coral"
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
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                How to use this pipeline
              </p>
              <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-1.5">
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
              tint="var(--rd-golden-tint)"
              accent="var(--rd-golden-dark)"
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
              tint="var(--rd-golden-tint)"
              accent="var(--rd-golden-dark)"
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
          <h2 className="font-display font-bold text-[17px] text-rd-text">
            Pipeline board
          </h2>
          <p className="text-[11.5px] text-rd-text-secondary mt-0.5">
            Drag a card between columns to update its status. Click any card to
            open the steps checklist. (Example data for this prototype -
            dragging won't persist.)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold text-[12.5px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-3.5 py-2 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add manually
        </button>
      </div>

      <div className="mt-3">
        {applications.length === 0 ? (
          <RdCard className="px-6 py-10 text-center">
            <Briefcase className="w-10 h-10 text-rd-coral mx-auto mb-3" />
            <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] max-w-md mx-auto">
              No applications yet. Track one from the Browse Jobs tab - the
              Track button on any role card prepends it here.
            </p>
          </RdCard>
        ) : (
          <ApplicationsKanban
            applications={applications}
            statuses={APPLICATION_STATUSES}
            statusLabels={APPLICATION_STATUS_LABELS}
            inactiveExternalIds={new Set()}
            onCardClick={(app) => setDrawerAppId(app.id)}
          />
        )}
      </div>

      <ApplicationDetailDrawer
        app={drawerApp}
        profile={profile}
        listingInactive={false}
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

function PipelineGuideTile({ tint, accent, head, body, highlight = false }) {
  return (
    <div className="rounded-[14px] px-3.5 py-3" style={{ background: tint }}>
      <p
        className="font-display font-bold text-[12.5px] leading-tight inline-flex items-center gap-1.5"
        style={{ color: accent }}
      >
        {highlight && <Star className="w-3 h-3" aria-hidden="true" />}
        {head}
      </p>
      <p
        className="text-[11.5px] leading-[1.45] mt-1.5"
        style={{ color: accent }}
      >
        {body}
      </p>
    </div>
  );
}
