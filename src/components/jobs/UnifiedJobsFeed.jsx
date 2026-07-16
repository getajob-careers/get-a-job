import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Briefcase, AlertCircle } from "lucide-react";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { useCareerRolesQuery } from "@/lib/queries/useCareerRoles";
import {
  inferExperienceLevel,
  allowedSenioritiesForLevel,
} from "@/lib/experienceLevel";
import { TRACK_CONFIG, TRACK_ORDER } from "@/lib/trackConfig";
import { scoreJobFit } from "@/lib/scoreJobFit";
import { scoringOpts } from "@/lib/flags";
import { dedupeJobsById } from "@/lib/careerJobsQuery";
import {
  UNIFIED_MAX_ROLES,
  TRACK_SIMILARITY_THRESHOLD,
  JOBS_SELECT_LIGHT,
  stretchAwareSeniorityFor,
  levelLabel,
} from "@/lib/jobsFeed";
import JobGridCard from "./JobGridCard";
import JobDetailModal from "./JobDetailModal";
import JobsSearchTab from "./JobsSearchTab";

// Matches feed: fetch a healthy buffer from the DB, reveal it 60 at a time
// from memory so "Load more" is instant, and refill from the DB before the
// buffer runs low. The fetch is light (no description) so a 120-row page is
// cheap; descriptions load on demand in the detail modal.
const MATCHES_FETCH_SIZE = 120;
const REVEAL_SIZE = 60;

// <UnifiedJobsFeed> — the unified two-tab jobs feed extracted from Jobs.jsx
// (PR1). Self-contained: it fetches its own profile / experiences /
// educations / career_roles through the SAME canonical query hooks + keys
// the Career page uses (useProfileQuery / useExperiencesQuery /
// useEducationQuery / useCareerRolesQuery), so the feed and the Career panels
// dedupe to one fetch per key and can't poison each other's cache (the
// career_roles projection is now the canonical superset, not the old narrow
// one). This component is the only jobs feed now — the legacy track-tabs path
// and its ?flag=legacy_track_tabs rollback hatch were removed in PR3 when
// /Jobs was consolidated into /Career.
//
// Reuse seam: renders the tabs + feed body only (no page header / banners —
// those are page chrome). The optional onTabChange callback reports the
// active tab so a host (Jobs.jsx) can keep a tab-aware subhead in sync; hosts
// that don't need it (Career, PR2) simply omit it.
//
// singleColumn forces the card grid to one column on BOTH tabs. /career mounts
// the feed in a narrow column where the default md:grid-cols-2 squeezes cards
// until role/company names clip — it passes singleColumn so cards get the full
// column width. /jobs (full-width) and the legacy path omit it, so their grid
// class strings stay byte-identical (visually unchanged).
//
// Behaviour is a faithful copy of Jobs.jsx's unified path. The only dev-only
// diagnostic dropped is the ?debug=1 console echo.
/**
 * @param {{ onTabChange?: (tab: string) => void, singleColumn?: boolean }} props
 */
export default function UnifiedJobsFeed({ onTabChange, singleColumn = false }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const { data: profile } = useProfileQuery(user?.id);
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: educations = [] } = useEducationQuery(user?.id);
  const { data: careerRoles = [] } = useCareerRolesQuery(user?.id, { profile });

  const experienceLevel = useMemo(
    () => inferExperienceLevel(experiences, educations),
    [experiences, educations],
  );
  const allowedSeniorities = useMemo(
    () => allowedSenioritiesForLevel(experienceLevel),
    [experienceLevel],
  );

  const rolesByTrack = useMemo(() => {
    const groups = { track_1: [], track_2: [], track_3: [] };
    for (const r of careerRoles) {
      if (!r?.title || !groups[r.track]) continue;
      groups[r.track].push(r);
    }
    for (const t of TRACK_ORDER) {
      groups[t].sort(
        (a, b) =>
          (Number(b.readiness_score) || 0) - (Number(a.readiness_score) || 0),
      );
    }
    return groups;
  }, [careerRoles]);

  const [jobs, setJobs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emptyReason, setEmptyReason] = useState(null);
  // How many of the gated/sorted jobs are revealed (client-side reveal from
  // the fetched buffer). Bumps by REVEAL_SIZE on "Load more".
  const [visibleCount, setVisibleCount] = useState(REVEAL_SIZE);
  // The job whose detail modal is open (null = closed).
  const [openJob, setOpenJob] = useState(null);
  // Deep-link prefill (PR3): /Career?role=<title> — and the retired /Jobs route
  // that forwards to it — opens the Search tab with the role seeded into the
  // keyword box. roleParam drives the initial tab here; the seed string is
  // handed to JobsSearchTab as initialKeyword. A role-less mount opens on the
  // "matches" tab. Read once on mount (useState initializer), so clearing the
  // keyword afterward doesn't re-seed from the still-present URL param.
  const roleParam = searchParams.get("role") || "";
  const [unifiedTab, setUnifiedTab] = useState(
    roleParam ? "search" : "matches",
  );
  const requestSeqRef = useRef(0);

  // Report the active tab to the host (tab-aware subhead) — fires on mount
  // and on every switch. Hosts pass a stable setter; omit to ignore.
  useEffect(() => {
    onTabChange?.(unifiedTab);
  }, [unifiedTab, onTabChange]);

  const scoredById = useMemo(() => {
    if (!profile || jobs.length === 0) return {};
    const opts = scoringOpts();
    const out = {};
    for (const job of jobs) {
      out[job.id] = scoreJobFit(
        { profile, experiences, educations },
        job,
        opts,
      );
    }
    return out;
  }, [profile, experiences, educations, jobs]);

  // relevance_match GATES feed membership (primary + adjacent + unknown pass;
  // "off" drops). Within the gated set, sort by attainability_score DESC — the
  // number the card actually shows and the picks/stretch bands are built on
  // (Option A: the for-you feed is single-score on attainability). The visible
  // % is monotonic within each section. relevance_tier is only a tiebreaker for
  // equal attainability: it must never reorder a higher-score job below a
  // lower-score one (that produced the "75% listed after 21%" ordering bug).
  // fit_score (the Search-tab number) breaks remaining ties.
  const displayedJobs = useMemo(() => {
    if (jobs.length === 0 || !profile) return jobs;
    const rankRel = { primary: 0, adjacent: 1, unknown: 2 };
    const gated = jobs.filter((job) => {
      const r = scoredById[job.id];
      if (!r) return false;
      return r.relevance_match && r.relevance_match !== "off";
    });
    gated.sort((a, b) => {
      const aa = scoredById[a.id].attainability_score ?? 0;
      const ab = scoredById[b.id].attainability_score ?? 0;
      if (ab !== aa) return ab - aa;
      const ra = rankRel[scoredById[a.id].relevance_match];
      const rb = rankRel[scoredById[b.id].relevance_match];
      if (ra !== rb) return ra - rb;
      const fa = scoredById[a.id].fit_score ?? 0;
      const fb = scoredById[b.id].fit_score ?? 0;
      return fb - fa;
    });
    return gated;
  }, [jobs, scoredById, profile]);

  // Reveal only the first `visibleCount` of the gated/sorted feed (the rest
  // sit in memory until the user loads more).
  const shownJobs = useMemo(
    () => displayedJobs.slice(0, visibleCount),
    [displayedJobs, visibleCount],
  );

  // Split the revealed feed into "Our picks for you" (strong + good bands)
  // and "Worth a stretch" (stretch + reach), preserving order.
  const sectionedJobs = useMemo(() => {
    const picks = [];
    const stretch = [];
    for (const job of shownJobs) {
      const b = scoredById[job.id]?.attainability_band;
      if (b === "strong" || b === "good") picks.push(job);
      else stretch.push(job);
    }
    return { picks, stretch };
  }, [shownJobs, scoredById]);

  // "Load more" shows while there's buffer left to reveal OR more to fetch.
  const canShowMore = visibleCount < displayedJobs.length || hasMore;

  const buildJobsQuery = useCallback(
    (offsetArg) => {
      // Union role titles across all three tracks (capped), stretch-aware
      // seniority, work_type from the profile. The relevance gate runs
      // client-side in displayedJobs.
      const unionedRoles = [];
      const seen = new Set();
      for (const t of TRACK_ORDER) {
        for (const r of rolesByTrack[t] || []) {
          if (!r?.title || seen.has(r.title)) continue;
          seen.add(r.title);
          unionedRoles.push(r.title);
          if (unionedRoles.length >= UNIFIED_MAX_ROLES) break;
        }
        if (unionedRoles.length >= UNIFIED_MAX_ROLES) break;
      }
      if (unionedRoles.length === 0) return { _empty: "no_roles" };
      const stretchSeniorities = stretchAwareSeniorityFor(allowedSeniorities);
      const workTypes = Array.isArray(profile?.work_type)
        ? profile.work_type
        : [];
      return supabase
        .rpc("search_jobs_by_role_titles", {
          p_role_titles: unionedRoles,
          p_limit: MATCHES_FETCH_SIZE,
          p_offset: offsetArg,
          p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
          p_max_seniority: stretchSeniorities,
          p_work_types: workTypes.length > 0 ? workTypes : null,
        })
        .select(JOBS_SELECT_LIGHT);
    },
    [rolesByTrack, allowedSeniorities, profile],
  );

  const fetchJobs = useCallback(
    async ({ offsetArg, append }) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);

      const built = buildJobsQuery(offsetArg);
      if (built?._empty === "no_roles") {
        if (seq !== requestSeqRef.current) return;
        setJobs([]);
        setHasMore(false);
        setLoading(false);
        setEmptyReason("no_roles");
        return;
      }

      const { data, error: qError } = await built;
      if (seq !== requestSeqRef.current) return;

      if (qError) {
        console.error("[jobs] query failed:", qError);
        setError("Couldn't load jobs - try again.");
        setLoading(false);
        return;
      }

      const rows = data || [];
      setJobs((prev) => (append ? dedupeJobsById([...prev, ...rows]) : rows));
      setHasMore(rows.length >= MATCHES_FETCH_SIZE);
      setEmptyReason(rows.length === 0 && !append ? "no_matches" : null);
      setLoading(false);
    },
    [buildJobsQuery],
  );

  // Preview hatch — paint a force-empty state without a real RPC call.
  const previewForceEmpty = searchParams.get("preview-force-empty");
  // DEV-only injection: a preview harness can set window.__GAJ_PREVIEW_JOBS__
  // to a fixture job array so the full Career preview renders the populated
  // grid without auth or the (RLS-empty) RPC. Folds to null in prod builds.
  const previewInjectedJobs =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    Array.isArray(window.__GAJ_PREVIEW_JOBS__)
      ? window.__GAJ_PREVIEW_JOBS__
      : null;

  useEffect(() => {
    if (!user?.id) return;
    if (previewForceEmpty) {
      setJobs([]);
      setHasMore(false);
      setLoading(false);
      setEmptyReason(previewForceEmpty);
      return;
    }
    if (previewInjectedJobs) {
      setJobs(previewInjectedJobs);
      setHasMore(false);
      setLoading(false);
      setVisibleCount(REVEAL_SIZE);
      setEmptyReason(previewInjectedJobs.length === 0 ? "no_matches" : null);
      return;
    }
    setOffset(0);
    setVisibleCount(REVEAL_SIZE);
    fetchJobs({ offsetArg: 0, append: false });
  }, [user?.id, fetchJobs, previewForceEmpty, previewInjectedJobs]);

  const handleLoadMore = () => {
    // Reveal the next chunk from the in-memory buffer instantly.
    const nextVisible = visibleCount + REVEAL_SIZE;
    setVisibleCount(nextVisible);
    // Refill from the DB before the buffer runs dry (revealed count is
    // within one chunk of everything we've fetched + gated), if more exist.
    if (
      hasMore &&
      !loading &&
      nextVisible + REVEAL_SIZE >= displayedJobs.length
    ) {
      const next = offset + MATCHES_FETCH_SIZE;
      setOffset(next);
      fetchJobs({ offsetArg: next, append: true });
    }
  };

  const seniorityIndicator = `Filtered to ${levelLabel(experienceLevel)} roles based on your experience`;
  const countCopy = `${displayedJobs.length} role${displayedJobs.length === 1 ? "" : "s"} matched to you`;

  return (
    <>
      {/* Two-tab switcher — sticky to the top of the scrolling jobs column
          (Career fixed-shell) so the tabs/filters stay while cards scroll. */}
      <div className="flex gap-2 mb-5 md:sticky md:top-0 md:z-10 md:bg-rd-bg-page md:pt-1 md:pb-3 md:-mt-1">
        <UnifiedTabButton
          label="Top Matches for You"
          active={unifiedTab === "matches"}
          onClick={() => setUnifiedTab("matches")}
        />
        <UnifiedTabButton
          label="Search All Jobs"
          active={unifiedTab === "search"}
          onClick={() => setUnifiedTab("search")}
        />
      </div>

      {unifiedTab === "search" ? (
        <JobsSearchTab
          profile={profile}
          experiences={experiences}
          educations={educations}
          singleColumn={singleColumn}
          initialKeyword={roleParam}
        />
      ) : (
        <>
          {/* Status row — count + seniority indicator */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <p className="font-display font-bold text-[15px] text-rd-text">
              {countCopy}
            </p>
            <p className="text-[11px] uppercase tracking-[0.08em] font-mono text-rd-text-secondary">
              {seniorityIndicator}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && jobs.length === 0 ? (
            <JobsLoading />
          ) : displayedJobs.length === 0 ? (
            <JobsEmpty
              emptyReason={emptyReason}
              inKeywordMode={false}
              inTrackMode={true}
              appliedKeyword=""
              selectedTrack="track_1"
              jobsCount={jobs.length}
            />
          ) : (
            <>
              <div className="space-y-7">
                {sectionedJobs.picks.length > 0 && (
                  <section>
                    <SectionHeader
                      title="Our picks for you"
                      subtitle="Your strongest matches - apply with confidence"
                      count={sectionedJobs.picks.length}
                    />
                    <JobGrid
                      jobs={sectionedJobs.picks}
                      scoredById={scoredById}
                      unified
                      singleColumn={singleColumn}
                      onOpen={(j, s, tc) =>
                        setOpenJob({ job: j, scoreResult: s, trackColor: tc })
                      }
                    />
                  </section>
                )}
                {sectionedJobs.stretch.length > 0 && (
                  <section>
                    <SectionHeader
                      title="Worth a stretch"
                      subtitle="Adjacent roles you could grow into - a reach today, not a bad match"
                      count={sectionedJobs.stretch.length}
                    />
                    {sectionedJobs.picks.length === 0 && (
                      <p className="text-[12.5px] text-rd-text-secondary leading-[1.55] mb-3 max-w-2xl">
                        No strong picks in this batch yet - here are relevant
                        roles worth a look as you build toward them.
                      </p>
                    )}
                    <JobGrid
                      jobs={sectionedJobs.stretch}
                      scoredById={scoredById}
                      unified
                      singleColumn={singleColumn}
                      onOpen={(j, s, tc) =>
                        setOpenJob({ job: j, scoreResult: s, trackColor: tc })
                      }
                    />
                  </section>
                )}
              </div>
              {canShowMore && (
                <div className="text-center mt-7">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-5 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
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
        </>
      )}
    </>
  );
}

// ───── Tab switcher + grid + section header + states ─────

function UnifiedTabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center font-display font-bold text-[13px] rounded-full px-4 py-1.5 transition-colors ${
        active
          ? "bg-rd-coral text-white"
          : "bg-rd-bg-soft text-rd-text-secondary hover:text-rd-text"
      }`}
    >
      {label}
    </button>
  );
}

function JobGrid({ jobs, scoredById, unified = false, onOpen }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {jobs.map((job) => {
        const perJobTrack = scoredById[job.id]?.track;
        const trackRdColor = perJobTrack
          ? TRACK_CONFIG[perJobTrack]?.rdColor
          : null;
        return (
          <JobGridCard
            key={job.id}
            job={job}
            scoreResult={scoredById[job.id]}
            trackColor={trackRdColor}
            unified={unified}
            onOpen={(j, s) => onOpen?.(j, s, trackRdColor)}
          />
        );
      })}
    </div>
  );
}

function SectionHeader({ title, subtitle, count }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display font-extrabold text-[18px] text-rd-text">
          {title}
        </h2>
        <span className="text-[12px] font-mono text-rd-text-tertiary">
          {count}
        </span>
      </div>
      {subtitle && (
        <p className="text-[12px] text-rd-text-secondary mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function JobsLoading() {
  return (
    <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-12 shadow-rd text-center">
      <Loader2 className="w-6 h-6 animate-spin text-rd-text-secondary mx-auto mb-2" />
      <p className="text-[13px] text-rd-text-secondary">Loading jobs…</p>
    </div>
  );
}

// Empty state — reproduced byte-for-byte from Jobs.jsx so the unified feed's
// behaviour is identical post-extraction. Track-flavoured copy is preserved
// as-is (selectedTrack is always "track_1" here); PR2 can revisit the wording.
function JobsEmpty({
  emptyReason,
  inKeywordMode,
  inTrackMode,
  appliedKeyword,
  selectedTrack,
  jobsCount,
}) {
  const trackCfg = TRACK_CONFIG[selectedTrack];
  return (
    <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-10 shadow-rd text-center">
      <Briefcase className="w-10 h-10 text-rd-coral mx-auto mb-3" />
      {emptyReason === "no_roles" ? (
        <>
          <p className="text-[14px] font-display font-bold text-rd-text">
            No Track {trackCfg.number} ({trackCfg.name}) roles yet.
          </p>
          <p className="text-[12.5px] text-rd-text-secondary mt-1.5 max-w-md mx-auto leading-[1.55]">
            Run your Career Roadmap to generate track-classified roles, then
            come back here to browse matching jobs.
          </p>
          <Link
            to={createPageUrl("Roadmap")}
            className="mt-5 inline-flex items-center gap-1.5 font-display font-bold text-[12.5px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-4 py-2 transition-colors"
          >
            Go to Career Roadmap
          </Link>
        </>
      ) : inKeywordMode ? (
        <p className="text-[14px] font-display font-bold text-rd-text-secondary">
          No results for &ldquo;{appliedKeyword}&rdquo;. Try a different
          keyword.
        </p>
      ) : inTrackMode && jobsCount > 0 ? (
        <>
          <p className="text-[14px] font-display font-bold text-rd-text">
            No Track {trackCfg.number} ({trackCfg.name}) jobs right now.
          </p>
          <p className="text-[12.5px] text-rd-text-secondary mt-1.5 max-w-md mx-auto leading-[1.55]">
            {jobsCount} job{jobsCount === 1 ? "" : "s"} matched your Track{" "}
            {trackCfg.number} role titles, but none scored as Track{" "}
            {trackCfg.number} fit for your profile. Try{" "}
            {selectedTrack === "track_1"
              ? "Track 2 (Detour) or Track 3 (Growth)"
              : selectedTrack === "track_2"
                ? "Track 3 (Growth)"
                : "another track"}
            .
          </p>
        </>
      ) : (
        <p className="text-[14px] font-display font-bold text-rd-text-secondary">
          No jobs match your Track {trackCfg.number} roles right now.
        </p>
      )}
    </div>
  );
}
