import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { scoreApplication } from "@/lib/scoreApplication";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ExternalLink,
  Briefcase,
  MapPin,
  CheckCircle2,
  PlusCircle,
  Search,
  Target,
  Clock,
} from "lucide-react";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { inferExperienceLevel, allowedSenioritiesForLevel } from "@/lib/experienceLevel";

// Page rebuild (PR 3 of jobs-cache rollout, 2026-05-17).
//
// Frontend cut over from the on-demand `browse-jobs` + `generate-top-picks`
// edge functions to direct supabase-js queries against public.jobs (the
// local cache populated nightly by scripts/refresh-jobs.ts).
//
// What changed:
//   * Top Picks section removed — Browse + Score-on-demand is the single
//     interaction model now.
//   * No edge function in the read path. RLS allows authenticated SELECT
//     on jobs. Sub-100ms queries instead of 1-2 sec via Active Jobs DB.
//   * Keyword search uses pg_trgm index (`ilike '%kw%'` on title);
//     tier mode uses `.or('title.ilike.%role1%,title.ilike.%role2%')`
//     built from the user's career_roles. Keyword and tier are mutually
//     exclusive — switching one clears the other.
//   * Add to Tracker stores ats_source + external_id so the Tracker page
//     can show a "may no longer be active" badge when jobs.is_active=false.

const TIER_LABELS = {
  tier_1: "Tier 1 — Your Move",
  tier_2: "Tier 2 — Plan B",
  tier_3: "Tier 3 — Work Toward",
};
const TIER_ORDER = ["tier_1", "tier_2", "tier_3"];
const PROFILE_STALE_TIME = 30 * 60 * 1000;
const BROWSE_PAGE_SIZE = 20;
const MAX_TIER_ROLES = 8;  // ILIKE OR fan-out per tier query

const SENIORITY_LABEL = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  director: "Director",
  executive: "Exec",
};

// One chip per card: years-based when parseable (covers ~60% of jobs),
// seniority bucket otherwise.
function experienceChipText(job) {
  if (job.years_experience_min == null) {
    return SENIORITY_LABEL[job.seniority] || "Mid";
  }
  if (job.years_experience_max != null && job.years_experience_max > job.years_experience_min) {
    return `${job.years_experience_min}-${job.years_experience_max} yrs`;
  }
  if (job.years_experience_min === 0) return "0+ yrs";
  return `${job.years_experience_min}+ yrs`;
}

function formatPostedDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const ageDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (ageDays <= 0) return "Today";
  if (ageDays === 1) return "Yesterday";
  if (ageDays < 7) return `${ageDays}d ago`;
  if (ageDays < 30) return `${Math.floor(ageDays / 7)}w ago`;
  return d.toLocaleDateString();
}

// ─────────── Add-to-tracker ───────────

async function addJobToTracker({ user, queryClient, job, matchScore, matchedSkills, matchReason }) {
  // Idempotency check — match on (ats_source, external_id) for jobs
  // added from Browse; fall back to title-only for manual rows.
  let dupQuery = supabase.from("applications").select("id").eq("user_id", user.id).limit(1);
  if (job.ats_source && job.external_id) {
    dupQuery = dupQuery.eq("ats_source", job.ats_source).eq("external_id", job.external_id);
  } else {
    dupQuery = dupQuery.ilike("role_title", job.title);
  }
  const { data: existing } = await dupQuery;
  if (existing?.length > 0) return { duplicate: true };

  const jd = job.description || "";
  const { data: inserted, error } = await supabase.from("applications").insert({
    user_id: user.id,
    role_title: job.title,
    company: job.company_name || "Unknown",
    status: "interested",
    source: "job_suggestion",
    ats_source: job.ats_source || null,
    external_id: job.external_id || null,
    cv_skills_emphasized: matchedSkills || [],
    job_description: jd,
    url: job.apply_url || "",
    location: job.location_city || job.location_raw || "",
    notes: matchReason || "",
    ...(typeof matchScore === "number" && { qualification_score: matchScore / 100 }),
  }).select("id").single();

  if (error) {
    console.error("Failed to add to tracker:", error);
    return { error };
  }
  queryClient.invalidateQueries({ queryKey: ["applications"] });
  if (inserted?.id && jd && matchScore == null) {
    scoreApplication(supabase, queryClient, inserted.id, jd, user.id);
  }
  return { ok: true };
}

// ─────────── Job card ───────────

function JobCard({ job, scoreResult, scoring, onScore }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const posted = formatPostedDate(job.date_posted);
  const chip = experienceChipText(job);
  const hasDescription = Boolean(job.description && job.description.length > 50);

  const scored = !!scoreResult;
  const score = scored ? Math.round(scoreResult.match_score || 0) : null;
  const scoreColor = score == null ? ""
    : score >= 75 ? "text-emerald-600 bg-emerald-50"
    : score >= 50 ? "text-amber-600 bg-amber-50"
    : "text-red-600 bg-red-50";

  const handleAdd = async () => {
    setAdding(true);
    const res = await addJobToTracker({
      user, queryClient, job,
      matchScore: scoreResult?.match_score,
      matchedSkills: scoreResult?.matched_skills,
      matchReason: scoreResult?.match_reason,
    });
    setAdding(false);
    if (res.ok || res.duplicate) setAdded(true);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 hover:border-[#D4D4D4] transition-all flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">{job.title}</h3>
          <p className="text-sm text-[#525252] mt-0.5">{job.company_name}</p>
        </div>
        {scored && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${scoreColor}`}>
            {score}% match
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[#A3A3A3] mb-3">
        {job.location_city && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location_city}</span>
        )}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F5F5F5] text-[#525252] rounded">
          {chip}
        </span>
        {posted && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{posted}</span>}
      </div>

      {scored && scoreResult.match_reason && (
        <p className="text-xs text-[#525252] leading-relaxed mb-3">{scoreResult.match_reason}</p>
      )}
      {scored && scoreResult.matched_skills?.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">Your Strengths</p>
          <div className="flex flex-wrap gap-1.5">
            {scoreResult.matched_skills.slice(0, 5).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}
      {scored && scoreResult.missing_skills?.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">Skill Gaps</p>
          <div className="flex flex-wrap gap-1.5">
            {scoreResult.missing_skills.slice(0, 5).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-[#F5F5F5]">
        {job.apply_url ? (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-xs text-[#0A66C2] hover:underline font-medium">
            <Briefcase className="w-3.5 h-3.5" />Apply<ExternalLink className="w-3 h-3" />
          </a>
        ) : <span />}
        <div className="flex gap-2">
          {!scored && (
            <Button
              size="sm" variant="outline" onClick={onScore}
              disabled={scoring || !hasDescription}
              title={!hasDescription ? "Open the job posting first to see the full description" : undefined}
              className="text-xs">
              {scoring ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Scoring...</> :
                         <><Target className="w-3 h-3 mr-1" />Score This Job</>}
            </Button>
          )}
          <Button size="sm" onClick={handleAdd} disabled={adding || added}
            className={added ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-[#0A0A0A] hover:bg-[#262626] text-white"}>
            {adding ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Adding...</> :
             added ? <><CheckCircle2 className="w-3 h-3 mr-1" />Added</> :
                     <><PlusCircle className="w-3 h-3 mr-1" />Track</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────── Page ───────────

// pg_trgm similarity threshold for tier-mode searches. 0.3 (the default
// for the % operator) is generous enough to catch obvious variants like
// "Customer Success Specialist" matching "Customer Success Manager"
// without sliding into noise. Lower → more recall, more noise. Tuned via
// per-role diagnostic on the pilot user's tier list — see migration
// 20260517_jobs_trgm_search_rpc.sql for the full numbers.
const TIER_SIMILARITY_THRESHOLD = 0.3;

export default function JobSuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Profile + roles for the staleness banner (unchanged from prior version)
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
  // Education rows feed inferExperienceLevel via isCurrentlyStudent. Lives
  // in its own table since Phase B (separate from profiles flat columns).
  const { data: educations = [] } = useQuery({
    queryKey: ["education", user?.id],
    queryFn: async () => (await supabase.from("education").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });
  const stale = isAnalysisStale({ profile, experiences, certifications, projects });

  // Seniority filter: derived from experiences + education using the same
  // algorithm as generate-career-analysis. Memoised against the inputs so
  // we don't re-derive on every render. Pre-data state (queries still
  // resolving) is treated as early_career — most conservative bucket,
  // matches the edge function's default when experiences is empty.
  const experienceLevel = useMemo(
    () => inferExperienceLevel(experiences, educations),
    [experiences, educations],
  );
  const allowedSeniorities = useMemo(
    () => allowedSenioritiesForLevel(experienceLevel),
    [experienceLevel],
  );

  // Career roles for the tier-mode query — grouped by tier client-side.
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

  // ── Browse state ──────────────────────────────────────────────────
  // Mode is exactly one of tier | keyword. Switching one clears the other.
  const [mode, setMode] = useState("tier");          // "tier" | "keyword"
  const [selectedTier, setSelectedTier] = useState("tier_1");
  const [keyword, setKeyword] = useState("");        // what's in the input
  const [appliedKeyword, setAppliedKeyword] = useState("");  // committed on Enter

  const [jobs, setJobs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emptyReason, setEmptyReason] = useState(null);  // 'no_roles' | 'no_matches' | null

  const [scoredJobs, setScoredJobs] = useState({});  // id → {match_score, ...}
  const [scoringIds, setScoringIds] = useState(new Set());

  // Refs to capture the current filter version so a stale request doesn't
  // overwrite a fresh one (e.g. user clicks T1 then T2 in quick succession).
  const requestSeqRef = useRef(0);

  // Build the query for the current mode + offset.
  //
  // Tier mode: pg_trgm RPC. Returns IL active jobs whose title is similar
  // (>= 0.3 similarity) to ANY of the user's roles for that tier,
  // ordered by best-match similarity DESC then date_posted DESC. The RPC
  // dedupes a job that matches multiple roles. Required after PR #42 —
  // direct ILIKE matching missed compound role names like "Associate
  // Product Manager" (zero matches when "Product Manager" matches 55+).
  //
  // Keyword mode: direct .from('jobs').select() with ILIKE — keyword
  // search expects literal substring intent and doesn't benefit from
  // fuzzy matching.
  const buildJobsQuery = useCallback((modeArg, tier, kw, offsetArg) => {
    if (modeArg === "keyword") {
      const safe = kw.replace(/[%,]/g, " ").trim();
      let q = supabase
        .from("jobs")
        .select("id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry")
        .eq("is_il", true)
        .eq("is_active", true)
        // Same seniority gate as the tier-mode RPC — a Junior user
        // searching "software engineer" shouldn't see Senior SWE.
        .in("seniority", allowedSeniorities)
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
        p_max_seniority: allowedSeniorities,
      })
      .select("id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry");
  }, [rolesByTier, allowedSeniorities]);

  const fetchJobs = useCallback(async ({ modeArg, tier, kw, offsetArg, append }) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);

    const built = buildJobsQuery(modeArg, tier, kw, offsetArg);
    if (built?._empty === "no_roles") {
      // Bail before hitting the network — happens when tier has no roles
      if (seq !== requestSeqRef.current) return;
      setJobs([]); setHasMore(false); setLoading(false); setEmptyReason("no_roles");
      return;
    }

    const { data, error: qError } = await built;
    if (seq !== requestSeqRef.current) return;  // a newer request superseded us

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

  // Refetch whenever mode / tier / appliedKeyword changes. Reset paging.
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

  // Score-this-job: calls analyze-job-match on demand
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5 text-[#0A0A0A]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Job Board</h1>
        </div>
        <p className="text-sm text-[#A3A3A3]">
          Live listings from top companies, updated nightly.
        </p>
        {stale && (
          <p className="text-xs text-amber-700 mt-1">
            Profile updated since last analysis ·{" "}
            <Link to={createPageUrl("Roadmap")} className="underline hover:text-amber-800">
              refresh roadmap
            </Link>
          </p>
        )}
      </div>

      {noProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700 mb-6">
          Complete your onboarding first so we can match jobs to your profile.
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {TIER_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTierClick(t)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              mode === "tier" && selectedTier === t
                ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
            }`}>
            {TIER_LABELS[t]}
          </button>
        ))}
        <form onSubmit={handleKeywordSubmit} className="relative flex-1 min-w-[240px] max-w-[360px] ml-auto">
          <Search className="w-3.5 h-3.5 text-[#A3A3A3] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search titles (Enter to apply)"
            className="text-sm pl-8"
          />
        </form>
      </div>

      {mode === "keyword" && appliedKeyword && (
        <div className="flex items-center gap-2 mb-4 text-xs text-[#525252]">
          <span>Searching &quot;{appliedKeyword}&quot;</span>
          <button
            type="button"
            onClick={() => handleTierClick(selectedTier)}
            className="text-[#0A66C2] hover:underline">
            Back to {TIER_LABELS[selectedTier]}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-3">
          {error}
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#E5E5E5]">
          <Loader2 className="w-6 h-6 animate-spin text-[#A3A3A3] mx-auto mb-2" />
          <p className="text-sm text-[#525252]">Loading jobs…</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-[#E5E5E5]">
          <Briefcase className="w-8 h-8 text-[#A3A3A3] mx-auto mb-3" />
          {emptyReason === "no_roles" ? (
            <>
              <p className="text-sm font-medium text-[#525252]">
                No {TIER_LABELS[selectedTier]} roles yet — run your Career Roadmap.
              </p>
              <Link to={createPageUrl("Roadmap")} className="inline-block mt-3 text-xs text-[#0A66C2] hover:underline">
                Go to Career Roadmap →
              </Link>
            </>
          ) : mode === "keyword" ? (
            <p className="text-sm font-medium text-[#525252]">
              No results for &quot;{appliedKeyword}&quot;. Try a different keyword.
            </p>
          ) : (
            <p className="text-sm font-medium text-[#525252]">
              No jobs match your {TIER_LABELS[selectedTier]} roles right now.
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
              />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-6">
              <Button onClick={handleLoadMore} disabled={loading} variant="outline" size="sm">
                {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Loading</> : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
