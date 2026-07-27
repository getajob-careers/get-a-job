import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileUser, Columns3, Compass } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { createPageUrl } from "@/utils";
import CVStudioLive from "@/components/cv-studio/CVStudioLive";
import UnifiedJobsFeed from "@/components/jobs/UnifiedJobsFeed";
import { useCareerRolesQuery } from "@/lib/queries/useCareerRoles";
import MatchedRolesPanel, {
  sortMatchedRoles,
  resolveActiveRoleId,
} from "@/components/career/MatchedRolesPanel";
import HomeTrackerTab from "./HomeTrackerTab";
import CvMatchedRolesRail from "./CvMatchedRolesRail";

// ThreeTabHome - the canvas 3-tab home surface (CV | Tracker | Browse Jobs) at /,
// flag ON. TABS-ONLY: the shell chrome (top bar, sidebar, ground, frame) is
// already provided by CanvasShell, which wraps this via Layout's flag fork - so
// this renders only the segmented pill + the three REAL tab bodies. No greeting /
// hero / stat cards (per Eli's reframe: canvas surface, mockup colour).
//
// The tab bodies are the REAL components (fixtures live only in the preview):
//   CV      -> CVStudioLive with the CvMatchedRolesRail as its right rail (each
//              card Tailors a CV, auto-adding the role to the tracker) and the
//              per-piece "Revise with AI" affordance on the document. The rail
//              reads the ["applications"] cache as source of truth (no more stale
//              Tracked). Both are flag-on props; /CVAgent keeps the CV Agent panel.
//   Tracker -> HomeTrackerTab (the canonical ["applications", uid] pipeline).
//   Jobs    -> UnifiedJobsFeed (self-fetching; singleColumn for the narrow column).

const TABS = [
  { id: "cv", label: "CV", icon: FileUser },
  { id: "tracker", label: "Tracker", icon: Columns3 },
  { id: "jobs", label: "Browse Jobs", icon: Compass },
];
const TAB_IDS = TABS.map((t) => t.id);

export default function ThreeTabHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    data: profile,
    isFetched: profileFetched,
    isError: profileError,
  } = useProfileQuery(user?.id);

  // Onboarding redirect guard - flag-ON parity with <Home/> (Home.jsx:263).
  // The flag-off home carries this guard; this shell did not, so an
  // un-onboarded user under the NEXT_DESIGN reveal (?next=1 / env-ON) stayed
  // on /Home instead of being bounced into the onboarding flow (Flip-2
  // blocker - Layout only gates chrome, not routing). Fails open to
  // Onboarding on any profile error, exactly like the legacy path. Deleted at
  // reveal-cleanup when the two homes unify.
  useEffect(() => {
    if (!user || !profileFetched) return;
    if (profileError) {
      navigate(createPageUrl("Onboarding"));
      return;
    }
    if (profileFetched && !profile) {
      navigate(createPageUrl("Onboarding"));
    } else if (profile && !profile.onboarding_complete) {
      navigate(createPageUrl("Onboarding"));
    }
  }, [user, profileFetched, profileError, profile, navigate]);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    TAB_IDS.includes(urlTab) ? urlTab : "cv",
  );
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  // Sync the active tab when ?tab changes externally - e.g. Generate CV from a
  // job card sets ?tab=cv&application_id to open the freshly generated CV.
  useEffect(() => {
    if (urlTab && TAB_IDS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab, activeTab]);

  // Browse Jobs renders the matched-roles why-panel beside the feed - the same
  // panel Career shows. Same canonical career_roles hook + key the feed uses,
  // so they share one cache entry and one analysis-pending poll. Own expand
  // state (independent of Career's instance).
  const { data: roles = [], isLoading: loadingRoles } = useCareerRolesQuery(
    user?.id,
    { profile },
  );
  const sortedRoles = useMemo(() => sortMatchedRoles(roles), [roles]);
  const [expandedRoleId, setExpandedRoleId] = useState(null);
  const activeRoleId = resolveActiveRoleId(sortedRoles, expandedRoleId);
  const rolesGoalName = profile?.five_year_role || "your 5-year goal";

  const selectTab = (id) => {
    setActiveTab(id);
    // Keep the URL in sync so deep-links / the /Jobs redirect land on the tab,
    // without stacking history entries.
    const next = new URLSearchParams(searchParams);
    if (id === "cv") next.delete("tab");
    else next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  // ARIA APG tab pattern: roving tabindex + arrow/Home/End keys move focus and
  // activate. Only the active tab is in the tab order (tabIndex 0); the arrows
  // walk between the three, so a keyboard user tabs INTO the control once then
  // arrows across it.
  const tabRefs = useRef([]);
  const onTabKeyDown = (e) => {
    const count = TABS.length;
    let nextIndex = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      nextIndex = (activeIndex + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      nextIndex = (activeIndex - 1 + count) % count;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = count - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    selectTab(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Segmented-pill tabs (canvas comp A): one confident control. */}
      <div
        className="relative flex w-full max-w-[440px] mx-auto bg-rd-bg-soft rounded-full p-1 flex-shrink-0"
        role="tablist"
        aria-label="Home sections"
      >
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-1 rounded-full bg-rd-primary shadow-rd transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{
            width: "calc((100% - 0.5rem) / 3)",
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[index] = el)}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={onTabKeyDown}
              className={`relative z-10 flex-1 inline-flex items-center justify-center gap-1.5 py-2 min-h-[44px] rounded-full font-display font-bold rd-t-body-s transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                active
                  ? "text-white"
                  : "text-rd-text-secondary hover:text-rd-text"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab body. Scrolls on mobile; each column owns its scroll on desktop.
          relative so the bottom edge-fade below can pin to it. */}
      <div className="relative mt-4 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
        {activeTab === "cv" && (
          // Canvas ground: CVStudioView paints its OWN framed lanes on it (the
          // document + matched-roles cards; the coach is the shell sidebar), so
          // there is no single wrapping card here (RULED item 2).
          <div className="w-full md:h-full md:overflow-hidden">
            <CVStudioLive
              rightRail={<CvMatchedRolesRail />}
              enablePieceRevise
            />
          </div>
        )}
        {/* Tracker owns its own desktop scroll (same as jobs): the tab body is
            md:overflow-hidden and the funnel + guide + kanban have no internal
            scroll, so without this the content below the fold is unreachable on
            wide desktop. Pre-existing since #628 (the #638 jobs fix missed it);
            mobile unaffected (the tab body already scrolls; this is md+ only). */}
        {activeTab === "tracker" && (
          <div className="md:h-full md:overflow-y-auto">
            <HomeTrackerTab />
          </div>
        )}
        {/* Jobs owns its own desktop scroll: the tab body is md:overflow-hidden
            and the feed (60-180 cards) has no internal scroll, so without this
            the cards below the fold were unreachable on wide desktop. Mobile is
            unaffected (the tab body already scrolls; this only applies md+). */}
        {activeTab === "jobs" && (
          // Inside the coach shell rail the md-band content region (~470px at a
          // 780 viewport) is too narrow to sit a readable feed beside the panel:
          // side-by-side there starves one column (proven pre-cert). So stack
          // below lg (each column gets the full width; the container owns the
          // scroll) and only go side-by-side at lg, where there is room for the
          // Career-style proportional split (feed 1.55 : panel 1). Career itself
          // is a full-width page with no rail, so it keeps its md side-by-side.
          <div className="flex flex-col lg:flex-row gap-5 items-start md:h-full md:min-h-0 md:overflow-y-auto lg:overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="w-full lg:flex-[1.55] min-w-0 lg:h-full lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <UnifiedJobsFeed singleColumn />
            </div>
            <MatchedRolesPanel
              roles={sortedRoles}
              goalName={rolesGoalName}
              expandedId={activeRoleId}
              onToggle={setExpandedRoleId}
              size="comfortable"
              scrollSelf
              scrollAt="lg"
              isLoading={loadingRoles}
              className="w-full lg:flex-1 min-w-0"
            />
          </div>
        )}
        {/* Bottom edge-fade (desktop only, where the columns inner-scroll): the
            list dissolves into the page at the container's bottom edge instead
            of hard-clipping. Top is left clean - the sticky filter bar / tab
            pills already own it. pointer-events-none so it never blocks a card. */}
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-rd-bg-page to-transparent"
        />
      </div>
    </div>
  );
}
