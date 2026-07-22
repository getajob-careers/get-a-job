// CvMatchedRolesRail - the CV tab's right rail: the user's matched roles.
// Promoted from the Home3TabCvTab preview's TopMatchesPanel.
//
// As of Batch C the per-card actions (Generate CV / Apply / "+") live ON the
// JobGridCard itself (flag-on) - the card's hover-actions ARE the interface. The
// rail no longer renders its own Track / Tailor button row (two UIs for the same
// verbs was redundant) and keeps NO tracking logic: the card reads the
// ["applications"] cache for its own tracked state via useJobCardActions.
//
// Rendered only in the flag-on CV tab (passed to CVStudioLive as `rightRail`).

import React, { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import JobGridCard from "@/components/jobs/JobGridCard";
import JobDetailModal from "@/components/jobs/JobDetailModal";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import { useTopMatches } from "./useTopMatches";

export default function CvMatchedRolesRail() {
  const { matches, initialShown, scoredById, isLoading, isError, noRoles } =
    useTopMatches();
  const [openJob, setOpenJob] = useState(null);
  // Reveal `initialShown` (15), load-more to the fetched buffer (30). The
  // picks/stretch split runs on the revealed slice so both sections grow.
  const [visibleCount, setVisibleCount] = useState(initialShown);
  const shown = matches.slice(0, visibleCount);
  const picks = shown.filter((j) => {
    const b = scoredById[j.id]?.attainability_band;
    return b === "strong" || b === "good";
  });
  const stretch = shown.filter((j) => {
    const b = scoredById[j.id]?.attainability_band;
    return b !== "strong" && b !== "good";
  });
  const canShowMore = visibleCount < matches.length;

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto cv-scroll px-4 py-4">
      <h2 className="font-display font-bold rd-t-body-m text-rd-text px-0.5">
        Your matched roles
      </h2>

      {isLoading ? (
        <div className="rd-r-md border border-rd-border bg-rd-bg-card px-4 py-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-rd-text-secondary mx-auto mb-2" />
          <p className="rd-t-body-s text-rd-text-secondary">
            Finding your matches…
          </p>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rd-r-md border border-rd-primary/40 bg-rd-primary-tint px-3.5 py-3 rd-t-body-s text-rd-primary-dark">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Couldn't load matches - try again.</span>
        </div>
      ) : noRoles ? (
        <div className="rd-r-md border border-rd-border bg-rd-bg-card px-4 py-6 text-center">
          <p className="rd-t-body-s text-rd-text-secondary leading-[1.5]">
            Run your Career Roadmap to generate matched roles, then your matches
            show up here.
          </p>
        </div>
      ) : picks.length === 0 && stretch.length === 0 ? (
        <div className="rd-r-md border border-rd-border bg-rd-bg-card px-4 py-6 text-center">
          <p className="rd-t-body-s text-rd-text-secondary leading-[1.5]">
            No matches right now - check the Browse Jobs tab for the full
            search.
          </p>
        </div>
      ) : (
        <>
          {picks.length > 0 && (
            <MatchSection
              title="Our picks for you"
              jobs={picks}
              scoredById={scoredById}
              onOpen={setOpenJob}
            />
          )}
          {stretch.length > 0 && (
            <MatchSection
              title="Worth a stretch"
              jobs={stretch}
              scoredById={scoredById}
              onOpen={setOpenJob}
            />
          )}
          {canShowMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + initialShown)}
              className="mx-auto mt-1 inline-flex items-center font-display font-semibold rd-t-body-s text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-4 py-2 transition-colors"
            >
              Show more roles
            </button>
          )}
        </>
      )}

      {openJob && (
        <JobDetailModal
          job={openJob.job}
          scoreResult={openJob.scoreResult}
          trackColor={openJob.trackColor}
          unified
          onClose={() => setOpenJob(null)}
        />
      )}
    </div>
  );
}

function MatchSection({ title, jobs, scoredById, onOpen }) {
  return (
    <div>
      {/* Tightened section-eyebrow recipe (from Batch B's modal headers):
          crisper + denser - smaller, more tracking, semibold, tighter margin. */}
      <p className="text-[9.5px] uppercase tracking-[0.12em] font-semibold text-rd-text-eyebrow font-mono mb-1 px-0.5">
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const scoreResult = scoredById[job.id];
          const perJobTrack = scoreResult?.track;
          const trackColor = perJobTrack
            ? TRACK_CONFIG[perJobTrack]?.rdColor
            : null;
          return (
            <JobGridCard
              key={job.id}
              job={job}
              scoreResult={scoreResult}
              trackColor={trackColor}
              unified
              onOpen={(j, s) => onOpen({ job: j, scoreResult: s, trackColor })}
            />
          );
        })}
      </div>
    </div>
  );
}
