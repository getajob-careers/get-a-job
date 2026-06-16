import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { useCareerRolesQuery } from "@/lib/queries/useCareerRoles";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2,
  Briefcase,
  Search,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import {
  inferExperienceLevel,
  allowedSenioritiesForLevel,
} from "@/lib/experienceLevel";
import { TRACK_CONFIG, TRACK_ORDER } from "@/lib/trackConfig";
import { scoreJobFit } from "@/lib/scoreJobFit";
import JobCard from "../components/jobs/JobCard";
import UnifiedJobsFeed from "../components/jobs/UnifiedJobsFeed";
import {
  BROWSE_PAGE_SIZE,
  MAX_TRACK_ROLES,
  TRACK_SIMILARITY_THRESHOLD,
  JOBS_SELECT,
  seniorityFilterFor,
  levelLabel,
} from "@/lib/jobsFeed";

// Jobs page. The unified two-tab feed (Top Matches + Search All Jobs) is the
// default and lives in <UnifiedJobsFeed>. The legacy Track 1/2/3 tabs stay
// here behind ?flag=legacy_track_tabs as the no-redeploy rollback hatch.
//
// PR1 (career-feed integration): the unified feed was extracted into
// <UnifiedJobsFeed> so /career can reuse the same component. This page now
// renders that component on the default path and keeps ONLY the legacy track
// machinery + render inline. career_roles is read through the canonical
// useCareerRolesQuery (superset projection) so this page, the extracted feed,
// and Career.jsx all dedupe to one fetch per key — closing the same-key /
// different-shape cache poison documented in useProfile.js.

const PROFILE_STALE_TIME = 30 * 60 * 1000;

export default function JobSuggestions() {
  const { user } = useAuth();

  // Profile + roles for the staleness banner + seniority inference
  const { data: profile } = useProfileQuery(user?.id);
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: certifications = [] } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () =>
      (await supabase.from("certifications").select("*").eq("user_id", user.id))
        .data || [],
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () =>
      (await supabase.from("projects").select("*").eq("user_id", user.id))
        .data || [],
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
  const { data: educations = [] } = useEducationQuery(user?.id);
  const stale = isAnalysisStale({
    profile,
    experiences,
    certifications,
    projects,
  });

  const experienceLevel = useMemo(
    () => inferExperienceLevel(experiences, educations),
    [experiences, educations],
  );
  const allowedSeniorities = useMemo(
    () => allowedSenioritiesForLevel(experienceLevel),
    [experienceLevel],
  );

  // Canonical career_roles (superset `*`) — shared key/shape with Career.jsx
  // + <UnifiedJobsFeed>. The legacy track path below reads only {title, track}.
  const { data: careerRoles = [] } = useCareerRolesQuery(user?.id, { profile });

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

  const hasAnyRoles = careerRoles.length > 0;

  const [searchParams] = useSearchParams();
  const linkedRole = searchParams.get("role") || "";

  // The unified feed is the default; ?flag=legacy_track_tabs forces the old
  // track-tabs path. Every `!unifiedListEnabled` branch below is the legacy
  // path, kept intact + cleanly removable.
  const flagParam = searchParams.get("flag") || "";
  const unifiedListEnabled = !flagParam.includes("legacy_track_tabs");

  // Mirror of the unified feed's active tab (reported via onTabChange) so the
  // page subhead stays tab-aware while the tab state lives in the feed.
  const [activeUnifiedTab, setActiveUnifiedTab] = useState("matches");

  // ── Legacy track-tab state (only used when !unifiedListEnabled) ────────
  const [mode, setMode] = useState(
    linkedRole ? "keyword" : hasAnyRoles ? "track" : "keyword",
  );
  const [selectedTrack, setSelectedTrack] = useState("track_1");
  const [keyword, setKeyword] = useState(linkedRole);
  const [appliedKeyword, setAppliedKeyword] = useState(linkedRole);

  const defaultedRef = useRef(false);
  useEffect(() => {
    if (defaultedRef.current) return;
    if (linkedRole) {
      defaultedRef.current = true;
      return;
    }
    if (careerRoles.length === 0) return;
    defaultedRef.current = true;
    setMode("track");
  }, [careerRoles.length, linkedRole]);

  const [jobs, setJobs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emptyReason, setEmptyReason] = useState(null);
  const requestSeqRef = useRef(0);

  const scoredById = useMemo(() => {
    if (!profile || jobs.length === 0) return {};
    const out = {};
    for (const job of jobs) {
      out[job.id] = scoreJobFit({ profile, experiences, educations }, job);
    }
    return out;
  }, [profile, experiences, educations, jobs]);

  // Legacy track-mode honest filter: only show jobs the scorer also classifies
  // as the selected track. Keyword mode surfaces all matching titles.
  const displayedJobs = useMemo(() => {
    if (jobs.length === 0 || !profile) return jobs;
    if (mode !== "track") return jobs;
    return jobs.filter((job) => scoredById[job.id]?.track === selectedTrack);
  }, [jobs, scoredById, mode, selectedTrack, profile]);

  const buildJobsQuery = useCallback(
    (modeArg, track, kw, offsetArg) => {
      const seniorities = seniorityFilterFor(
        modeArg,
        track,
        allowedSeniorities,
      );

      if (modeArg === "keyword") {
        const safe = kw.replace(/[%,]/g, " ").trim();
        let q = supabase
          .from("jobs")
          .select(JOBS_SELECT)
          .eq("is_il", true)
          .eq("is_active", true)
          .in("seniority", seniorities)
          .order("date_posted", { ascending: false, nullsFirst: false })
          .range(offsetArg, offsetArg + BROWSE_PAGE_SIZE - 1);
        if (safe) q = q.ilike("title", `%${safe}%`);
        return q;
      }

      // track mode → RPC
      const roles = (rolesByTrack[track] || [])
        .slice(0, MAX_TRACK_ROLES)
        .map((r) => r.title);
      if (roles.length === 0) return { _empty: "no_roles" };
      const workTypes = Array.isArray(profile?.work_type)
        ? profile.work_type
        : [];
      return supabase
        .rpc("search_jobs_by_role_titles", {
          p_role_titles: roles,
          p_limit: BROWSE_PAGE_SIZE,
          p_offset: offsetArg,
          p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
          p_max_seniority: seniorities,
          p_work_types: workTypes.length > 0 ? workTypes : null,
        })
        .select(JOBS_SELECT);
    },
    [rolesByTrack, allowedSeniorities, profile],
  );

  const fetchJobs = useCallback(
    async ({ modeArg, track, kw, offsetArg, append }) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);

      const built = buildJobsQuery(modeArg, track, kw, offsetArg);
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
        setError("Couldn't load jobs — try again.");
        setLoading(false);
        return;
      }

      const rows = data || [];
      setJobs((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length >= BROWSE_PAGE_SIZE);
      setEmptyReason(rows.length === 0 && !append ? "no_matches" : null);
      setLoading(false);
    },
    [buildJobsQuery],
  );

  const previewForceEmpty = searchParams.get("preview-force-empty");

  useEffect(() => {
    // The unified feed fetches its own jobs inside <UnifiedJobsFeed>; the
    // legacy fetch only runs on the legacy path.
    if (unifiedListEnabled) return;
    if (!user?.id) return;
    if (previewForceEmpty) {
      setJobs([]);
      setHasMore(false);
      setLoading(false);
      setEmptyReason(previewForceEmpty);
      return;
    }
    setOffset(0);
    fetchJobs({
      modeArg: mode,
      track: selectedTrack,
      kw: appliedKeyword,
      offsetArg: 0,
      append: false,
    });
  }, [
    unifiedListEnabled,
    user?.id,
    mode,
    selectedTrack,
    appliedKeyword,
    fetchJobs,
    previewForceEmpty,
  ]);

  const handleTrackClick = (t) => {
    setMode("track");
    setSelectedTrack(t);
    setKeyword("");
    setAppliedKeyword("");
  };

  const handleKeywordSubmit = (e) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setMode("keyword");
    setAppliedKeyword(trimmed);
  };

  const handleClearKeyword = () => {
    setKeyword("");
    setAppliedKeyword("");
    setMode(hasAnyRoles ? "track" : "keyword");
  };

  const handleLoadMore = () => {
    const next = offset + BROWSE_PAGE_SIZE;
    setOffset(next);
    fetchJobs({
      modeArg: mode,
      track: selectedTrack,
      kw: appliedKeyword,
      offsetArg: next,
      append: true,
    });
  };

  const noProfile = !profile;
  const inTrackMode = mode === "track";
  const inKeywordMode = mode === "keyword";

  const seniorityIndicator = (() => {
    if (inTrackMode && selectedTrack === "track_3") {
      return "Showing all seniority levels — these are roles you're working toward";
    }
    return `Filtered to ${levelLabel(experienceLevel)} roles based on your experience`;
  })();

  const trackCfg = TRACK_CONFIG[selectedTrack];
  const countCopy = (() => {
    if (inKeywordMode && appliedKeyword) {
      return `${displayedJobs.length} job${displayedJobs.length === 1 ? "" : "s"} matching “${appliedKeyword}”`;
    }
    if (inKeywordMode) {
      return `${displayedJobs.length} job${displayedJobs.length === 1 ? "" : "s"}`;
    }
    return `${displayedJobs.length} role${displayedJobs.length === 1 ? "" : "s"} on Track ${trackCfg.number}`;
  })();

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-7">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          Jobs
        </p>
        <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.08] tracking-tight text-rd-text mt-1">
          {unifiedListEnabled
            ? "Roles that fit you, best first."
            : "Live roles, scored against your tracks."}
        </h1>
        <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-2xl">
          {!unifiedListEnabled
            ? "Live tech postings from real company career pages, refreshed nightly. Filtered to your experience level and your career-roadmap tracks."
            : activeUnifiedTab === "search"
              ? "Browse the whole live board — every IL role, ranked best-fit for you, with filters for function, location, seniority and work type."
              : "Live postings from real company career pages, refreshed nightly. Matched to your domain and experience and ranked best-fit-first — split into your strongest picks and stretch roles worth a look."}
        </p>
      </div>

      {/* Stale roadmap banner */}
      {stale && (
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[14px] border border-rd-golden bg-rd-golden-tint px-4 py-3 text-[13px] text-rd-golden-dark">
          <p className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Your profile has changed since your last roadmap analysis. Refresh
              to update track matches.
            </span>
          </p>
          <Link
            to={createPageUrl("Roadmap")}
            className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold text-[12px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-3.5 py-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh roadmap
          </Link>
        </div>
      )}

      {/* No-profile banner */}
      {noProfile && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[14px] border border-rd-border bg-rd-bg-soft px-4 py-3 text-[13px] text-rd-text-secondary">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Complete your onboarding first so we can match jobs to your profile.
          </span>
        </div>
      )}

      {unifiedListEnabled ? (
        <UnifiedJobsFeed onTabChange={setActiveUnifiedTab} />
      ) : (
        <>
          {/* Search bar (legacy) */}
          <form
            onSubmit={handleKeywordSubmit}
            className="flex items-center gap-2.5 rounded-[14px] border border-rd-border bg-rd-bg-card px-4 py-2.5 shadow-rd mb-3"
          >
            <Search className="w-4 h-4 text-rd-text-tertiary flex-shrink-0" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search a role or company…"
              className="flex-1 bg-transparent border-0 outline-none text-[13.5px] text-rd-text placeholder:text-rd-text-tertiary"
            />
            {appliedKeyword && (
              <button
                type="button"
                onClick={handleClearKeyword}
                aria-label="Clear search"
                className="p-1 rounded-full hover:bg-rd-bg-soft text-rd-text-tertiary hover:text-rd-text transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Track filter pills (legacy) */}
          <div className="flex flex-wrap gap-2 mb-5">
            {TRACK_ORDER.map((id) => {
              const track = TRACK_CONFIG[id];
              const selected = inTrackMode && selectedTrack === id;
              return (
                <TrackFilterPill
                  key={id}
                  track={track}
                  selected={selected}
                  dimmed={inKeywordMode}
                  onClick={() => handleTrackClick(id)}
                />
              );
            })}
          </div>

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
              inKeywordMode={inKeywordMode}
              inTrackMode={inTrackMode}
              appliedKeyword={appliedKeyword}
              selectedTrack={selectedTrack}
              jobsCount={jobs.length}
            />
          ) : (
            <>
              <JobGrid jobs={displayedJobs} scoredById={scoredById} />
              {hasMore && (
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
        </>
      )}
    </div>
  );
}

// ───── Job grid (legacy single-grid) ─────

function JobGrid({ jobs, scoredById }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => {
        const perJobTrack = scoredById[job.id]?.track;
        const trackRdColor = perJobTrack
          ? TRACK_CONFIG[perJobTrack]?.rdColor
          : null;
        return (
          <JobCard
            key={job.id}
            job={job}
            scoreResult={scoredById[job.id]}
            trackColor={trackRdColor}
          />
        );
      })}
    </div>
  );
}

// ───── Track filter pill (legacy) ─────

const PILL_STYLES = {
  coral: {
    selectedBg: "var(--rd-coral)",
    selectedText: "#ffffff",
    idleBg: "var(--rd-coral-tint)",
    idleText: "var(--rd-coral-dark)",
  },
  teal: {
    selectedBg: "var(--rd-teal)",
    selectedText: "#ffffff",
    idleBg: "var(--rd-teal-tint)",
    idleText: "var(--rd-teal-dark)",
  },
  golden: {
    selectedBg: "var(--rd-golden)",
    selectedText: "#ffffff",
    idleBg: "var(--rd-golden-tint)",
    idleText: "var(--rd-golden-dark)",
  },
};

function TrackFilterPill({ track, selected, dimmed, onClick }) {
  const styles = PILL_STYLES[track.rdColor] || PILL_STYLES.coral;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="inline-flex items-center gap-1.5 font-display font-bold text-[12.5px] rounded-full px-3.5 py-1.5 transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: selected ? styles.selectedBg : styles.idleBg,
        color: selected ? styles.selectedText : styles.idleText,
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <span
        className="w-4 h-4 rounded-full inline-flex items-center justify-center font-display font-extrabold text-[10px] leading-none"
        style={{
          background: selected ? "rgba(255,255,255,0.25)" : styles.selectedBg,
          color: selected ? styles.selectedText : "#ffffff",
        }}
      >
        {track.number}
      </span>
      Track {track.number} · {track.name}
    </button>
  );
}

// ───── Loading + empty states (legacy) ─────

function JobsLoading() {
  return (
    <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-12 shadow-rd text-center">
      <Loader2 className="w-6 h-6 animate-spin text-rd-text-secondary mx-auto mb-2" />
      <p className="text-[13px] text-rd-text-secondary">Loading jobs…</p>
    </div>
  );
}

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
