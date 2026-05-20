import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Briefcase, Search, RefreshCw } from "lucide-react";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { inferExperienceLevel, allowedSenioritiesForLevel } from "@/lib/experienceLevel";
import { TIER_CONFIG, TIER_ORDER } from "@/lib/tierConfig";
import JobCard from "../components/jobs/JobCard";
import { JOBS_CSS } from "../components/jobs/jobsStyles";

// Page rebuild (PR 3 of jobs-cache rollout, 2026-05-17). Frontend cut over
// from on-demand edge functions to direct supabase-js queries against
// public.jobs (refreshed nightly by scripts/refresh-jobs.ts).

const PROFILE_STALE_TIME = 30 * 60 * 1000;
const BROWSE_PAGE_SIZE = 20;
const MAX_TIER_ROLES = 8;

// pg_trgm similarity threshold for tier-mode searches. 0.3 catches obvious
// variants ("Customer Success Specialist" matching "Customer Success Manager")
// without sliding into noise. See migration 20260517_jobs_trgm_search_rpc.sql.
const TIER_SIMILARITY_THRESHOLD = 0.3;

// All seniorities, used when bypassing the filter for tier_3.
const ALL_SENIORITIES = ["entry", "mid", "senior", "lead", "director", "executive"];

// Bypass the seniority filter for tier_3 only. Live data check (2026-05-20)
// showed that for early_career users, the strict filter was hiding 100% of
// "Senior Product Manager" jobs (66 listings → 0 visible) and "Senior
// Software Engineer" (112 → 0). Tier 3 is the "growth path" tier by
// definition — roles the user isn't qualified for yet. Hiding the senior
// roles defeats the discovery intent. Strict filter still applies to
// tier_1 (apply-now feed), tier_2 (qualified-but-off-path), and keyword
// mode — PR #76's bug stays fixed where it actually matters.
function seniorityFilterFor(mode, tier, allowedSeniorities) {
  if (mode === "tier" && tier === "tier_3") return ALL_SENIORITIES;
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
  const { data: profile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id);
      return data?.[0] || null;
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => (await supabase.from("experiences").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
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
  const { data: educations = [] } = useQuery({
    queryKey: ["education", user?.id],
    queryFn: async () => (await supabase.from("education").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
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
        .select("title, tier, readiness_score")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });

  const rolesByTier = useMemo(() => {
    const groups = { tier_1: [], tier_2: [], tier_3: [] };
    for (const r of careerRoles) {
      if (!r?.title || !groups[r.tier]) continue;
      groups[r.tier].push(r);
    }
    for (const t of TIER_ORDER) {
      groups[t].sort((a, b) => (Number(b.readiness_score) || 0) - (Number(a.readiness_score) || 0));
    }
    return groups;
  }, [careerRoles]);

  const hasAnyRoles = careerRoles.length > 0;

  // ── Browse state ──────────────────────────────────────────────────
  // Mode is exactly one of tier | keyword. Switching one clears the other.
  // Default to "keyword" for users who don't yet have career_roles so they
  // have something usable immediately (otherwise the page lands on Tier 1
  // and shows an empty state).
  const [mode, setMode] = useState(hasAnyRoles ? "tier" : "keyword");
  const [selectedTier, setSelectedTier] = useState("tier_1");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  // Flip the default once career_roles resolves, but only once (we don't
  // want to re-flip when the user has manually switched modes).
  const defaultedRef = useRef(false);
  useEffect(() => {
    if (defaultedRef.current) return;
    if (careerRoles.length === 0) return;
    defaultedRef.current = true;
    setMode("tier");
  }, [careerRoles.length]);

  const [jobs, setJobs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emptyReason, setEmptyReason] = useState(null);

  const [scoredJobs, setScoredJobs] = useState({});
  const [scoringIds, setScoringIds] = useState(new Set());

  const requestSeqRef = useRef(0);

  const buildJobsQuery = useCallback((modeArg, tier, kw, offsetArg) => {
    const seniorities = seniorityFilterFor(modeArg, tier, allowedSeniorities);

    if (modeArg === "keyword") {
      const safe = kw.replace(/[%,]/g, " ").trim();
      let q = supabase
        .from("jobs")
        .select("id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry")
        .eq("is_il", true)
        .eq("is_active", true)
        .in("seniority", seniorities)
        .order("date_posted", { ascending: false, nullsFirst: false })
        .range(offsetArg, offsetArg + BROWSE_PAGE_SIZE - 1);
      if (safe) q = q.ilike("title", `%${safe}%`);
      return q;
    }

    // tier mode → RPC
    const roles = (rolesByTier[tier] || []).slice(0, MAX_TIER_ROLES).map((r) => r.title);
    if (roles.length === 0) return { _empty: "no_roles" };
    return supabase
      .rpc("search_jobs_by_role_titles", {
        p_role_titles: roles,
        p_limit: BROWSE_PAGE_SIZE,
        p_offset: offsetArg,
        p_similarity_threshold: TIER_SIMILARITY_THRESHOLD,
        p_max_seniority: seniorities,
      })
      .select("id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry");
  }, [rolesByTier, allowedSeniorities]);

  const fetchJobs = useCallback(async ({ modeArg, tier, kw, offsetArg, append }) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);

    const built = buildJobsQuery(modeArg, tier, kw, offsetArg);
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

  useEffect(() => {
    if (!user?.id) return;
    setOffset(0);
    setScoredJobs({});
    fetchJobs({ modeArg: mode, tier: selectedTier, kw: appliedKeyword, offsetArg: 0, append: false });
  }, [user?.id, mode, selectedTier, appliedKeyword, fetchJobs]);

  const handleTierClick = (t) => {
    setMode("tier");
    setSelectedTier(t);
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

  const handleLoadMore = () => {
    const next = offset + BROWSE_PAGE_SIZE;
    setOffset(next);
    fetchJobs({ modeArg: mode, tier: selectedTier, kw: appliedKeyword, offsetArg: next, append: true });
  };

  const handleScoreJob = async (job) => {
    if (scoringIds.has(job.id)) return;
    setScoringIds((prev) => new Set(prev).add(job.id));
    try {
      const { data, error: scoreErr } = await supabase.functions.invoke("analyze-job-match", {
        body: { job_description: job.description, mode: "text" },
      });
      if (scoreErr) throw scoreErr;
      const matched = Array.isArray(data?.matched_requirements)
        ? data.matched_requirements.map((m) => m.requirement).filter(Boolean)
        : [];
      const missing = Array.isArray(data?.missing_requirements)
        ? data.missing_requirements.map((m) => m.requirement).filter(Boolean)
        : [];
      setScoredJobs((prev) => ({
        ...prev,
        [job.id]: {
          match_score: data?.match_score ?? 50,
          match_reason: data?.recommendation || data?.verdict || "",
          matched_skills: matched,
          missing_skills: missing,
        },
      }));
    } catch (err) {
      console.error("[score-job] failed:", err);
    } finally {
      setScoringIds((prev) => { const next = new Set(prev); next.delete(job.id); return next; });
    }
  };

  const noProfile = !profile;
  const inTierMode = mode === "tier";
  const inKeywordMode = mode === "keyword";

  // Seniority indicator copy depends on mode + tier. Tier 3 explicitly tells
  // the user that all levels are shown (because the filter is bypassed) so
  // the behavior is transparent.
  const seniorityIndicator = (() => {
    if (inTierMode && selectedTier === "tier_3") {
      return "Showing all seniority levels — these are roles you're working toward";
    }
    return `Filtered to ${levelLabel(experienceLevel)} roles based on your experience`;
  })();

  return (
    <>
      <style>{JOBS_CSS}</style>
      <div className="jobs">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-7">
            <p className="jb-eyebrow flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" />Live jobs
            </p>
            <h1 className="jb-h1 mt-1.5">Real roles, refreshed nightly.</h1>
            <p className="jb-sub">
              Israeli tech postings filtered to your level. Tier-aware browsing tied to your career roadmap.
            </p>
          </div>

          {/* Stale roadmap banner */}
          {stale && (
            <div className="jb-banner jb-banner-warning mb-6 flex items-center justify-between gap-4 flex-wrap">
              <p>Your profile has changed since your last roadmap analysis. Refresh to update tier matches.</p>
              <Link to={createPageUrl("Roadmap")} className="jb-btn jb-btn-primary jb-btn-sm flex-shrink-0">
                <RefreshCw className="w-3 h-3" />Refresh roadmap
              </Link>
            </div>
          )}

          {/* No-profile banner */}
          {noProfile && (
            <div className="jb-banner jb-banner-info mb-6">
              Complete your onboarding first so we can match jobs to your profile.
            </div>
          )}

          {/* Filter bar */}
          <div className="jb-filter-bar mb-3">
            {TIER_ORDER.map((id) => {
              const tier = TIER_CONFIG[id];
              const selected = inTierMode && selectedTier === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTierClick(id)}
                  className={`jb-tier-pill jb-tier-${tier.color}`}
                  data-selected={selected}
                  data-dim={inKeywordMode}
                >
                  <span className="jb-tier-pill-badge">{tier.number}</span>
                  Tier {tier.number} · {tier.name}
                </button>
              );
            })}
            <form onSubmit={handleKeywordSubmit} className="jb-search ml-auto">
              <Search className="w-3.5 h-3.5 jb-search-icon" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search any job title (Enter)"
                className="jb-search-input"
              />
            </form>
          </div>

          {/* Seniority indicator + mode breadcrumb */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="jb-seniority-chip">{seniorityIndicator}</span>
            {inKeywordMode && appliedKeyword && (
              <div className="jb-mode-notice">
                <span>Searching &quot;{appliedKeyword}&quot;</span>
                <button type="button" onClick={() => handleTierClick(selectedTier)}>
                  Back to Tier {TIER_CONFIG[selectedTier].number} · {TIER_CONFIG[selectedTier].name}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="jb-banner jb-banner-error mb-4">{error}</div>
          )}

          {loading && jobs.length === 0 ? (
            <div className="jb-card text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#52545A] mx-auto mb-2" />
              <p className="text-sm text-[#52545A]">Loading jobs…</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="jb-card text-center py-10">
              <Briefcase className="w-10 h-10 text-[#F87060] mx-auto mb-3" />
              {emptyReason === "no_roles" ? (
                <>
                  <p className="text-sm font-medium text-[#0E1014]">
                    No Tier {TIER_CONFIG[selectedTier].number} ({TIER_CONFIG[selectedTier].name}) roles yet.
                  </p>
                  <p className="text-xs text-[#9C9DA1] mt-1.5 max-w-md mx-auto">
                    Run your Career Roadmap to generate tier-classified roles, then come back here to browse matching jobs.
                  </p>
                  <Link to={createPageUrl("Roadmap")} className="jb-btn jb-btn-primary jb-btn-sm mt-4">
                    Go to Career Roadmap
                  </Link>
                </>
              ) : inKeywordMode ? (
                <p className="text-sm font-medium text-[#52545A]">
                  No results for &quot;{appliedKeyword}&quot;. Try a different keyword.
                </p>
              ) : (
                <p className="text-sm font-medium text-[#52545A]">
                  No jobs match your Tier {TIER_CONFIG[selectedTier].number} roles right now.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    scoreResult={scoredJobs[job.id]}
                    scoring={scoringIds.has(job.id)}
                    onScore={() => handleScoreJob(job)}
                    tierColor={inTierMode ? TIER_CONFIG[selectedTier].color : null}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="jb-btn jb-btn-outline jb-btn-sm"
                  >
                    {loading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading</>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
