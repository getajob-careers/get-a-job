// PROD ORIGINALS: TopMatchesPanel in src/pages/_preview/Home3TabCvTab.jsx
// (CV-tab column) + src/components/jobs/UnifiedJobsFeed.jsx (Browse tab);
// canvas clones — fixture-fed, Track → local state.
import React, { useMemo, useState } from "react";
import { Check, Plus, Wand2 } from "lucide-react";
import { CANVAS_MATCHES } from "../fixtures/canvasHome";
import CanvasJobModal from "./CanvasJobModal";
import CanvasJobCard from "./CanvasJobCard";
import { reveal, revealWith } from "./stagger";

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
      <p className="text-[10px] uppercase tracking-[0.08em] font-mono text-rd-text-eyebrow mb-1.5 px-0.5">
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {jobs.map((job, idx) => {
          const scoreResult = scoredById[job.id];
          const tracked = trackedIds.has(job.id);
          return (
            <div key={job.id} {...revealWith(idx, "flex flex-col gap-1.5")}>
              <CanvasJobCard
                job={job}
                scoreResult={scoreResult}
                index={idx}
                onOpen={(j, s) => setOpenJob({ job: j, scoreResult: s })}
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => track(job)}
                  disabled={tracked}
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold text-[11px] rounded-full px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed"
                  style={
                    tracked
                      ? {
                          background: "var(--rd-teal-tint)",
                          color: "var(--rd-teal-dark)",
                        }
                      : {
                          background: "var(--rd-bg-soft)",
                          color: "var(--rd-text)",
                        }
                  }
                >
                  {tracked ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  {tracked ? "Tracked" : "Track"}
                </button>
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold text-[11px] rounded-full px-2.5 py-1.5 bg-rd-bg-soft text-rd-text-secondary hover:text-rd-text transition-colors"
                  title="Prototype — not wired"
                >
                  <Wand2 className="w-3 h-3" />
                  Tailor CV
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display font-bold text-[14px] text-rd-text px-0.5">
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

  return (
    <div className="flex flex-col gap-4">
      {/* Segmented toggle with a sliding coral pill (idea #11) */}
      <div className="relative inline-flex self-start bg-rd-bg-soft rounded-full p-1">
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-full bg-rd-coral shadow-rd transition-all duration-200 ease-out"
          style={
            mode === "matches"
              ? { left: "0.25rem", right: "50%" }
              : { left: "50%", right: "0.25rem" }
          }
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
            className={`relative z-10 font-display font-bold text-[12.5px] rounded-full px-3.5 py-1.5 transition-colors ${
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
        <h2 className="font-display font-bold text-[15px] text-rd-text">
          {all.length} roles matched to you
        </h2>
        <span className="text-[10.5px] uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow">
          Filtered to entry / mid roles
        </span>
      </div>

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
