import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Briefcase, Search, RefreshCw, AlertCircle, X } from "lucide-react";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { inferExperienceLevel, allowedSenioritiesForLevel } from "@/lib/experienceLevel";
import { TRACK_CONFIG, TRACK_ORDER } from "@/lib/trackConfig";
import { scoreJobFit } from "@/lib/scoreJobFit";
import JobCard from "../components/jobs/JobCard";

// Page rebuild (PR 3 of jobs-cache rollout, 2026-05-17). Frontend cut over
// from on-demand edge functions to direct supabase-js queries against
// public.jobs (refreshed nightly by scripts/refresh-jobs.ts).
//
// PR 3D — Jobs restyled on rd tokens. Restyle-only on behavior; every
// query shape, RPC param, mode-switch path, deep-link, debug flag,
// pagination + scoreJobFit derivation is preserved verbatim. Track-color
// mapping switched from `track.color` (legacy green/gray/amber) to
// `track.rdColor` (coral/teal/golden) to match Home + Roadmap.

const PROFILE_STALE_TIME = 30 * 60 * 1000;
const BROWSE_PAGE_SIZE = 20;
const MAX_TRACK_ROLES = 8;

// pg_trgm similarity threshold for track-mode searches. 0.3 catches obvious
// variants ("Customer Success Specialist" matching "Customer Success Manager")
// without sliding into noise. See migration 20260517_jobs_trgm_search_rpc.sql.
const TRACK_SIMILARITY_THRESHOLD = 0.3;

// All seniorities, used when bypassing the filter for track_3.
const ALL_SENIORITIES = ["entry", "mid", "senior", "lead", "director", "executive"];

// Bypass the seniority filter for track_3 only. Live data check (2026-05-20)
// showed that for early_career users, the strict filter was hiding 100% of
// "Senior Product Manager" jobs (66 listings → 0 visible) and "Senior
// Software Engineer" (112 → 0). Track 3 is the "growth path" track by
// definition — roles the user isn't qualified for yet. Hiding the senior
// roles defeats the discovery intent. Strict filter still applies to
// track_1 (apply-now feed), track_2 (qualified-but-off-path), and keyword
// mode — PR #76's bug stays fixed where it actually matters.
function seniorityFilterFor(mode, track, allowedSeniorities) {
  if (mode === "track" && track === "track_3") return ALL_SENIORITIES;
  return allowedSeniorities;
}

// Map experienceLevel to a human-readable label used in the seniority chip.
function levelLabel(level) {
  if (level === "early_career") return "entry / mid";
  if (level === "mid_career") return "mid / senior";
  if (level === "senior_career") return "senior+";
  return "all levels";
}

export default function JobSuggestions() {
  const { user } = useAuth();

  // Profile + roles for the staleness banner + seniority inference
  const { data: profile } = useProfileQuery(user?.id);
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: certifications = [] } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => (await supabase.from("certifications").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => (await supabase.from("projects").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
  const { data: educations = [] } = useEducationQuery(user?.id);
  const stale = isAnalysisStale({ profile, experiences, certifications, projects });

  const experienceLevel = useMemo(
    () => inferExperienceLevel(experiences, educations),
    [experiences, educations],
  );
  const allowedSeniorities = useMemo(
    () => allowedSenioritiesForLevel(experienceLevel),
    [experienceLevel],
  );

  const { data: careerRoles = [] } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("career_roles")
        .select("title, track, readiness_score")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });

  const rolesByTrack = useMemo(() => {
    const groups = { track_1: [], track_2: [], track_3: [] };
    for (const r of careerRoles) {
      if (!r?.title || !groups[r.track]) continue;
      groups[r.track].push(r);
    }
    for (const t of TRACK_ORDER) {
      groups[t].sort((a, b) => (Number(b.readiness_score) || 0) - (Number(a.readiness_score) || 0));
    }
    return groups;
  }, [careerRoles]);

  const hasAnyRoles = careerRoles.length > 0;

  // ── Browse state ──────────────────────────────────────────────────
  // Deep-link support — Roadmap role cards send ?role=<title> so a user
  // clicking "See Product Manager jobs" lands on the Jobs page already
  // filtered to that role title via keyword search.
  const [searchParams] = useSearchParams();
  const linkedRole = searchParams.get("role") || "";

  // Mode is exactly one of track | keyword. Switching one clears the other.
  // Default to "keyword" for users who don't yet have career_roles so they
  // have something usable immediately (otherwise the page lands on Track 1
  // and shows an empty state). When ?role= is in the URL, we land in
  // keyword mode pre-filled with that role title.
  const [mode, setMode] = useState(linkedRole ? "keyword" : hasAnyRoles ? "track" : "keyword");
  const [selectedTrack, setSelectedTrack] = useState("track_1");
  const [keyword, setKeyword] = useState(linkedRole);
  const [appliedKeyword, setAppliedKeyword] = useState(linkedRole);

  // Flip the default once career_roles resolves, but only once (we don't
  // want to re-flip when the user has manually switched modes). Skip the
  // flip when we arrived via ?role= deep link — the user explicitly asked
  // for keyword mode.
  const defaultedRef = useRef(false);
  useEffect(() => {
    if (defaultedRef.current) return;
    if (linkedRole) { defaultedRef.current = true; return; }
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

  // Deterministic per-job fit score, computed on every render. Keyed on the
  // profile + experiences + educations + the jobs array so it only recomputes
  // when one of those changes. Replaces the previous LLM-based "Score this
  // job" button — every card now shows its fit + reasoning instantly.
  const scoredById = useMemo(() => {
    if (!profile || jobs.length === 0) return {};
    const out = {};
    for (const job of jobs) {
      out[job.id] = scoreJobFit({ profile, experiences, educations }, job);
    }
    return out;
  }, [profile, experiences, educations, jobs]);

  // PR-G fix: in track mode the tab is now an honest filter — only show
  // jobs the deterministic scorer ALSO classifies as the selected track.
  // Without this, the role-title trigram fetch was surfacing in-direction
  // jobs whose specific requirements (5+y experience, React stack, etc)
  // put the user in Track 2/3 territory, while the green Track 1 stripe
  // implied apply-now readiness. Keyword mode is unchanged — there's no
  // tab to honor, all matching titles surface.
  // PR-G1 fix: derive inTrackMode INLINE from `mode` instead of reading the
  // `const inTrackMode = mode === "track"` declared ~90 lines below. The
  // earlier reference triggered a production TDZ (`Cannot access 'fze'…`
  // in the minified bundle — `fze` was the lifted `inTrackMode` binding)
  // because React calls this useMemo factory at render time, BEFORE the
  // line that declares `inTrackMode` further down in the function body
  // has executed. Reading `mode` directly avoids the cross-line TDZ.
  const displayedJobs = useMemo(() => {
    if (mode !== "track" || jobs.length === 0 || !profile) return jobs;
    return jobs.filter((job) => scoredById[job.id]?.track === selectedTrack);
  }, [jobs, scoredById, mode, selectedTrack, profile]);

  // ?debug=1 — dump per-job scoreJobFit verdicts to console so we can
  // compare against the SQL simulation. Helps diagnose "expected N Track
  // 1 jobs, only seeing M" — usually narrows to either a request-shape
  // mismatch (different jobs returned than expected) or a scoreJobFit
  // divergence between JS and the SQL replica. Behind a URL flag so it
  // doesn't add console noise in normal use. Drop once the diagnostic
  // is no longer needed.
  useEffect(() => {
    if (searchParams.get("debug") !== "1") return;
    if (mode !== "track") return;
    if (!profile || jobs.length === 0) return;
    const rows = jobs.map((j) => {
      const s = scoredById[j.id] || {};
      const sig = s.signals || {};
      const limiter = (() => {
        if (sig.seniority_match === "above_ceiling") return "sen_cap";
        const gap = (sig.years_required_min ?? null) !== null && (sig.years_user ?? null) !== null
          ? sig.years_required_min - sig.years_user
          : null;
        if (gap !== null && gap >= 3) return "years_cap_T3";
        if (s.track === "track_2" && gap === 2) return "years_cap_T1_to_T2";
        if (s.track !== "track_1") {
          if (sig.function_family_match === false) return "family";
          if (sig.years_status === "below") return "years_axis";
          if ((sig.skill_match_pct ?? 100) < 50) return "skill";
          return "composite_low";
        }
        return null;
      })();
      return {
        title: j.title,
        company: j.company_name,
        is_remote: j.is_remote,
        req_seniority: j.req_seniority,
        req_years_min: j.req_years_min,
        function_family: j.function_family,
        fit: s.fit_score ?? null,
        track: s.track ?? null,
        skill_pct: sig.skill_match_pct ?? null,
        years_status: sig.years_status ?? null,
        sen_match: sig.seniority_match ?? null,
        fam_match: sig.function_family_match ?? null,
        limiter,
      };
    });
    /* eslint-disable no-console */
    console.groupCollapsed(
      `[debug] Jobs ${selectedTrack} — ${rows.length} candidates, ${
        rows.filter((r) => r.track === selectedTrack).length
      } pass filter`,
    );
    console.table(rows);
    console.log("profile.primary_domain:", profile?.primary_domain ?? null);
    console.log("profile.work_type:", profile?.work_type ?? null);
    console.log("userYears (totalYearsOfExperience):", rows[0]?.years_status ? "see signals.years_user" : "n/a");
    console.groupEnd();
    /* eslint-enable no-console */
  }, [searchParams, mode, selectedTrack, profile, jobs, scoredById]);

  const buildJobsQuery = useCallback((modeArg, track, kw, offsetArg) => {
    const seniorities = seniorityFilterFor(modeArg, track, allowedSeniorities);

    if (modeArg === "keyword") {
      const safe = kw.replace(/[%,]/g, " ").trim();
      let q = supabase
        .from("jobs")
        .select("id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence")
        .eq("is_il", true)
        .eq("is_active", true)
        .in("seniority", seniorities)
        .order("date_posted", { ascending: false, nullsFirst: false })
        .range(offsetArg, offsetArg + BROWSE_PAGE_SIZE - 1);
      if (safe) q = q.ilike("title", `%${safe}%`);
      return q;
    }

    // track mode → RPC
    const roles = (rolesByTrack[track] || []).slice(0, MAX_TRACK_ROLES).map((r) => r.title);
    if (roles.length === 0) return { _empty: "no_roles" };
    const workTypes = Array.isArray(profile?.work_type) ? profile.work_type : [];
    return supabase
      .rpc("search_jobs_by_role_titles", {
        p_role_titles: roles,
        p_limit: BROWSE_PAGE_SIZE,
        p_offset: offsetArg,
        p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
        p_max_seniority: seniorities,
        p_work_types: workTypes.length > 0 ? workTypes : null,
      })
      .select("id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence");
  }, [rolesByTrack, allowedSeniorities, profile]);

  const fetchJobs = useCallback(async ({ modeArg, track, kw, offsetArg, append }) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);

    const built = buildJobsQuery(modeArg, track, kw, offsetArg);
    if (built?._empty === "no_roles") {
      if (seq !== requestSeqRef.current) return;
      setJobs([]); setHasMore(false); setLoading(false); setEmptyReason("no_roles");
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
    setJobs((prev) => append ? [...prev, ...rows] : rows);
    setHasMore(rows.length >= BROWSE_PAGE_SIZE);
    setEmptyReason(rows.length === 0 && !append ? "no_matches" : null);
    setLoading(false);
  }, [buildJobsQuery]);

  // Preview hatch — let the harness paint a "force-empty" state without
  // a real RPC call. Inert in prod (the flag is never set there).
  const previewForceEmpty = searchParams.get("preview-force-empty");

  useEffect(() => {
    if (!user?.id) return;
    if (previewForceEmpty) {
      // Skip the real fetch — the harness already seeded an empty list
      // and the correct emptyReason via URL flag.
      setJobs([]);
      setHasMore(false);
      setLoading(false);
      setEmptyReason(previewForceEmpty);
      return;
    }
    setOffset(0);
    fetchJobs({ modeArg: mode, track: selectedTrack, kw: appliedKeyword, offsetArg: 0, append: false });
  }, [user?.id, mode, selectedTrack, appliedKeyword, fetchJobs, previewForceEmpty]);

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
    fetchJobs({ modeArg: mode, track: selectedTrack, kw: appliedKeyword, offsetArg: next, append: true });
  };

  const noProfile = !profile;
  const inTrackMode = mode === "track";
  const inKeywordMode = mode === "keyword";

  // Seniority indicator copy depends on mode + track. Track 3 explicitly tells
  // the user that all levels are shown (because the filter is bypassed) so
  // the behavior is transparent.
  const seniorityIndicator = (() => {
    if (inTrackMode && selectedTrack === "track_3") {
      return "Showing all seniority levels — these are roles you're working toward";
    }
    return `Filtered to ${levelLabel(experienceLevel)} roles based on your experience`;
  })();

  // Count-row copy. Mirrors the mockup's "21 roles on Track 1" header.
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
          Live roles, scored against your tracks.
        </h1>
        <p className="text-[13.5px] text-rd-text-secondary leading-[1.55] mt-2 max-w-2xl">
          Live tech postings from real company career pages, refreshed nightly. Filtered to your experience level and your career-roadmap tracks.
        </p>
      </div>

      {/* Stale roadmap banner */}
      {stale && (
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap rounded-[14px] border border-rd-golden bg-rd-golden-tint px-4 py-3 text-[13px] text-rd-golden-dark">
          <p className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Your profile has changed since your last roadmap analysis. Refresh to update track matches.</span>
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
          <span>Complete your onboarding first so we can match jobs to your profile.</span>
        </div>
      )}

      {/* Search bar */}
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

      {/* Track filter pills */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedJobs.map((job) => {
              // PR-G: card stripe + accent now reflect the per-job
              // deterministic track (scoreJobFit), not the selected tab
              // color. After the displayedJobs filter above they almost
              // always agree, but using the per-job value is what makes
              // keyword-mode cards still show their honest classification.
              const perJobTrack = scoredById[job.id]?.track;
              const trackRdColor = perJobTrack ? TRACK_CONFIG[perJobTrack]?.rdColor : null;
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
    </div>
  );
}

// ───── Track filter pill ─────

// Three pills mapping to track_1/2/3, each tinted with the track's
// rdColor (coral/teal/golden). Selected → solid track color; dimmed →
// muted (when keyword mode is active so the user can see the pills are
// inert but still navigable).
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

// ───── Loading + empty states ─────

function JobsLoading() {
  return (
    <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-6 py-12 shadow-rd text-center">
      <Loader2 className="w-6 h-6 animate-spin text-rd-text-secondary mx-auto mb-2" />
      <p className="text-[13px] text-rd-text-secondary">Loading jobs…</p>
    </div>
  );
}

function JobsEmpty({ emptyReason, inKeywordMode, inTrackMode, appliedKeyword, selectedTrack, jobsCount }) {
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
            Run your Career Roadmap to generate track-classified roles, then come back here to browse matching jobs.
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
          No results for &ldquo;{appliedKeyword}&rdquo;. Try a different keyword.
        </p>
      ) : inTrackMode && jobsCount > 0 ? (
        // Title-trigram fetch returned candidates but none cleared the
        // deterministic Track filter. PR-G: this is the "9 in-direction
        // CSMs but 0 actually Track 1 for you" case — honest signal,
        // not a bug.
        <>
          <p className="text-[14px] font-display font-bold text-rd-text">
            No Track {trackCfg.number} ({trackCfg.name}) jobs right now.
          </p>
          <p className="text-[12.5px] text-rd-text-secondary mt-1.5 max-w-md mx-auto leading-[1.55]">
            {jobsCount} job{jobsCount === 1 ? "" : "s"} matched your Track {trackCfg.number} role titles, but none scored as Track {trackCfg.number} fit for your profile. Try{" "}
            {selectedTrack === "track_1"
              ? "Track 2 (Detour) or Track 3 (Growth)"
              : selectedTrack === "track_2"
              ? "Track 3 (Growth)"
              : "another track"}.
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
