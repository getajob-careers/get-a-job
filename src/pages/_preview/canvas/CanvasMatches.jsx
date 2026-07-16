// PROD ORIGINALS: TopMatchesPanel in src/pages/_preview/Home3TabCvTab.jsx
// (CV-tab column) + src/components/jobs/UnifiedJobsFeed.jsx (Browse tab);
// canvas clones — fixture-fed, Track → local state.
import React, { useMemo, useState } from "react";
import { CANVAS_MATCHES } from "../fixtures/canvasHome";
import CanvasJobModal from "./CanvasJobModal";
import CanvasJobCard from "./CanvasJobCard";
import CanvasLogoLab from "./CanvasLogoLab";
import { reveal } from "./stagger";

// Fixture-fed match surfaces for the design canvas: the CV-tab right column
// (CanvasTopMatches) and the Browse Jobs tab (CanvasJobsFeed). Both reuse the
// REAL, presentational JobGridCard (it has no write path) and open the
// fixture-safe CanvasJobModal. Track adds to LOCAL state — no addJobToTracker,
// no DB. NOTE: JobGridCard still fires two harmless READ queries (company
// domains, hover description) that return empty for fixture ids; nothing writes.

const PICK_BANDS = new Set(["strong", "good"]);

function useCanvasMatches() {
  return useMemo(() => {
    const scoredById = {};
    const picks = [];
    const stretch = [];
    for (const m of CANVAS_MATCHES) {
      scoredById[m.job.id] = m.scoreResult;
      if (PICK_BANDS.has(m.scoreResult.attainability_band)) picks.push(m.job);
      else stretch.push(m.job);
    }
    return {
      scoredById,
      picks,
      stretch,
      all: CANVAS_MATCHES.map((m) => m.job),
    };
  }, []);
}

function useLocalTrack() {
  const [trackedIds, setTrackedIds] = useState(() => new Set());
  const track = (job) => setTrackedIds((prev) => new Set(prev).add(job.id));
  return { trackedIds, track };
}

// ───── CV tab: compact top-matches column ─────

export function CanvasTopMatches() {
  const { scoredById, picks, stretch } = useCanvasMatches();
  const { trackedIds, track } = useLocalTrack();
  const [openJob, setOpenJob] = useState(null);

  const Section = ({ title, jobs }) => (
    <div>
      <p className="rd-t-micro uppercase tracking-[0.08em] font-mono text-rd-text-eyebrow mb-1.5 px-0.5">
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {jobs.map((job, idx) => {
          const scoreResult = scoredById[job.id];
          return (
            <div key={job.id} {...reveal(idx)}>
              <CanvasJobCard
                job={job}
                scoreResult={scoreResult}
                index={idx}
                onOpen={(j, s) => setOpenJob({ job: j, scoreResult: s })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display font-bold rd-t-body-m text-rd-text px-0.5">
        Top matches for you
      </h2>
      {picks.length > 0 && <Section title="Our picks for you" jobs={picks} />}
      {stretch.length > 0 && <Section title="Worth a stretch" jobs={stretch} />}
      {openJob && (
        <CanvasJobModal
          job={openJob.job}
          scoreResult={openJob.scoreResult}
          tracked={trackedIds.has(openJob.job.id)}
          onTrack={track}
          onClose={() => setOpenJob(null)}
        />
      )}
    </div>
  );
}

// ───── Browse Jobs tab: full-width fixture feed ─────

export function CanvasJobsFeed() {
  const { scoredById, all } = useCanvasMatches();
  const { trackedIds, track } = useLocalTrack();
  const [openJob, setOpenJob] = useState(null);
  const [mode, setMode] = useState("matches"); // matches | all — both show fixtures
  const showLogoLab =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("logo") === "lab";

  return (
    <div className="flex flex-col gap-4 md:h-full md:min-h-0">
      {showLogoLab && <CanvasLogoLab />}
      {/* Segmented toggle with a sliding coral pill (idea #11). Equal-width
          segments (flex-1) so the pill exactly matches the active one; the pill
          is 50%−inset wide and slides via translateX(100%) — consistent 4px
          inset all round, no reflow (both labels stay bold + nowrap). */}
      <div className="relative flex w-full max-w-[360px] bg-rd-bg-soft rounded-full p-1">
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-1 rounded-full bg-rd-coral shadow-rd transition-transform duration-200 ease-out"
          style={{
            width: "calc(50% - 0.25rem)",
            transform: mode === "all" ? "translateX(100%)" : "translateX(0)",
          }}
        />
        {[
          ["matches", "Top Matches for You"],
          ["all", "Search All Jobs"],
        ].map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setMode(val)}
            aria-pressed={mode === val}
            className={`relative z-10 flex-1 whitespace-nowrap text-center font-display font-bold rd-t-body-s rounded-full px-3 py-1.5 transition-colors ${
              mode === val
                ? "text-white"
                : "text-rd-text-secondary hover:text-rd-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold rd-t-body-l text-rd-text">
          {all.length} roles matched to you
        </h2>
        <span className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow">
          Filtered to entry / mid roles
        </span>
      </div>

      {/* Grid scrolls inside its own container on desktop (app-shell); on
          mobile the page's single scroller owns it. Edge fades signal overflow. */}
      <div className="cx-fade-y md:flex-1 md:min-h-0 md:overflow-y-auto md:pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {all.map((job, idx) => (
            <div key={job.id} {...reveal(idx)}>
              <CanvasJobCard
                job={job}
                scoreResult={scoredById[job.id]}
                index={idx}
                onOpen={(j, s) => setOpenJob({ job: j, scoreResult: s })}
              />
            </div>
          ))}
        </div>
      </div>

      {openJob && (
        <CanvasJobModal
          job={openJob.job}
          scoreResult={openJob.scoreResult}
          tracked={trackedIds.has(openJob.job.id)}
          onTrack={track}
          onClose={() => setOpenJob(null)}
        />
      )}
    </div>
  );
}
