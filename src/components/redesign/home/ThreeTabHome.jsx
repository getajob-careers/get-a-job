import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileUser, Columns3, Compass } from "lucide-react";
import CVStudioLive from "@/components/cv-studio/CVStudioLive";
import UnifiedJobsFeed from "@/components/jobs/UnifiedJobsFeed";
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

  const selectTab = (id) => {
    setActiveTab(id);
    // Keep the URL in sync so deep-links / the /Jobs redirect land on the tab,
    // without stacking history entries.
    const next = new URLSearchParams(searchParams);
    if (id === "cv") next.delete("tab");
    else next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Segmented-pill tabs (canvas comp A): one confident control. */}
      <div
        className="relative flex w-full max-w-[440px] mx-auto bg-rd-bg-soft rounded-full p-1 flex-shrink-0"
        role="tablist"
      >
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-1 rounded-full bg-rd-coral shadow-rd transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{
            width: "calc((100% - 0.5rem) / 3)",
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(tab.id)}
              className={`relative z-10 flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full font-display font-bold rd-t-body-s transition-colors ${
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

      {/* Tab body. Scrolls on mobile; each column owns its scroll on desktop. */}
      <div className="mt-4 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
        {activeTab === "cv" && (
          <div className="w-full md:h-full md:overflow-hidden rd-lift rd-r-lg">
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
          <div className="md:h-full md:overflow-y-auto">
            <UnifiedJobsFeed singleColumn />
          </div>
        )}
      </div>
    </div>
  );
}
