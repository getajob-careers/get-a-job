import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  RefreshCw,
  ExternalLink,
  Briefcase,
  MapPin,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  Search,
  Target,
} from "lucide-react";
import { isAnalysisStale } from "@/lib/staleAnalysis";

// Page rebuild (2026-05-17): two sections.
//   1. Top Picks — cached weekly, AI-scored, 5-8 cards. Refresh button.
//   2. Browse Jobs — tier filter (T1/T2/T3), client-side keyword filter,
//      Load More via API offset. Cards are unscored by default; "Score This
//      Job" runs analyze-job-match on demand and replaces the card UI with
//      the scored variant.
//
// Killed:
//   * generate-job-suggestions (replaced by generate-top-picks + browse-jobs)
//   * "What to Look For" generic LLM suggestions (Browse view replaces them)
//   * Single role-dropdown picker (replaced by tier buttons that fan out
//     across all roles in the selected tier)

const TIER_LABELS = {
  tier_1: "Tier 1 — Your Move",
  tier_2: "Tier 2 — Plan B",
  tier_3: "Tier 3 — Work Toward",
};
const TIER_ORDER = ["tier_1", "tier_2", "tier_3"];
const PROFILE_STALE_TIME = 30 * 60 * 1000;
const BROWSE_STALE_TIME = 5 * 60 * 1000;
const BROWSE_PAGE_SIZE = 20;

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}

function formatPostedDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const ageDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (ageDays <= 0) return "Today";
  if (ageDays === 1) return "Yesterday";
  if (ageDays < 7) return `${ageDays} days ago`;
  if (ageDays < 30) return `${Math.floor(ageDays / 7)}w ago`;
  return d.toLocaleDateString();
}

// ─────────── Add-to-tracker helper used by both card types ───────────

async function addJobToTracker({ user, queryClient, job, matchScore, matchedSkills, matchReason }) {
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .ilike("role_title", job.title)
    .limit(1);
  if (existing?.length > 0) return { duplicate: true };

  const jd = job.description_snippet || job.description || "";
  const { data: inserted, error } = await supabase.from("applications").insert({
    user_id: user.id,
    role_title: job.title,
    company: job.company || "Unknown",
    status: "interested",
    source: "job_suggestion",
    cv_skills_emphasized: matchedSkills || [],
    job_description: jd,
    url: job.job_url || "",
    location: job.location || "",
    notes: matchReason || "",
    ...(typeof matchScore === "number" && { qualification_score: matchScore / 100 }),
  }).select("id").single();

  if (error) {
    console.error("Failed to add to tracker:", error);
    return { error };
  }
  queryClient.invalidateQueries({ queryKey: ["applications"] });
  // Score in background if we have a JD and no existing match score.
  if (inserted?.id && jd && matchScore == null) {
    scoreApplication(supabase, queryClient, inserted.id, jd, user.id);
  }
  return { ok: true };
}

// ─────────── Top Picks card (always scored) ───────────

function TopPickCard({ job }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const score = Math.round(job.match_score || 0);
  const scoreColor = score >= 75
    ? "text-emerald-600 bg-emerald-50"
    : score >= 50
      ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";
  const salary = formatSalary(job.salary_min, job.salary_max);

  const handleAdd = async () => {
    setAdding(true);
    const res = await addJobToTracker({
      user, queryClient, job,
      matchScore: score,
      matchedSkills: job.matched_skills,
      matchReason: job.match_reason,
    });
    setAdding(false);
    if (res.ok || res.duplicate) setAdded(true);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 hover:border-[#D4D4D4] transition-all flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">{job.title}</h3>
          <p className="text-sm text-[#525252] mt-0.5">{job.company}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${scoreColor}`}>
          {score}% match
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-[#A3A3A3] mb-3">
        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
        {salary && <span>{salary}</span>}
      </div>

      {job.match_reason && (
        <p className="text-xs text-[#525252] leading-relaxed mb-3">{job.match_reason}</p>
      )}

      {job.matched_skills?.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">Your Strengths</p>
          <div className="flex flex-wrap gap-1.5">
            {job.matched_skills.slice(0, 5).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {job.missing_skills?.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">Skill Gaps</p>
          <div className="flex flex-wrap gap-1.5">
            {job.missing_skills.slice(0, 5).map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F5F5F5]">
        {job.job_url ? (
          <a href={job.job_url} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-xs text-[#0A66C2] hover:underline font-medium">
            <Briefcase className="w-3.5 h-3.5" />Apply Now<ExternalLink className="w-3 h-3" />
          </a>
        ) : <span />}
        <Button size="sm" onClick={handleAdd} disabled={adding || added}
          className={added ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-[#0A0A0A] hover:bg-[#262626] text-white"}>
          {adding ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Adding...</> :
           added ? <><CheckCircle2 className="w-3 h-3 mr-1" />Added</> :
                   <><PlusCircle className="w-3 h-3 mr-1" />Add to Tracker</>}
        </Button>
      </div>
    </div>
  );
}

// ─────────── Browse card (unscored by default; "Score This Job" upgrades it) ───────────

function BrowseJobCard({ job, scoreResult, onScore, scoring }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const posted = formatPostedDate(job.date_posted);

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

  const scored = !!scoreResult;
  const score = scored ? Math.round(scoreResult.match_score || 0) : null;
  const scoreColor = score == null ? ""
    : score >= 75 ? "text-emerald-600 bg-emerald-50"
    : score >= 50 ? "text-amber-600 bg-amber-50"
    : "text-red-600 bg-red-50";

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 hover:border-[#D4D4D4] transition-all flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">{job.title}</h3>
          <p className="text-sm text-[#525252] mt-0.5">{job.company}</p>
        </div>
        {scored && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${scoreColor}`}>
            {score}% match
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-[#A3A3A3] mb-3">
        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
        {posted && <span>{posted}</span>}
        {job.source && <span className="text-[10px] uppercase tracking-wider">{job.source}</span>}
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
        {job.job_url ? (
          <a href={job.job_url} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-xs text-[#0A66C2] hover:underline font-medium">
            <Briefcase className="w-3.5 h-3.5" />Apply<ExternalLink className="w-3 h-3" />
          </a>
        ) : <span />}
        <div className="flex gap-2">
          {!scored && (
            <Button size="sm" variant="outline" onClick={onScore} disabled={scoring}
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

export default function JobSuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Profile + roles (for the staleness banner)
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
  const stale = isAnalysisStale({ profile, experiences, certifications, projects });

  // ── Top Picks ─────────────────────────────────────────────────────
  const [topPicksRefreshing, setTopPicksRefreshing] = useState(false);
  const [topPicksError, setTopPicksError] = useState(null);

  const topPicksQuery = useQuery({
    queryKey: ["topPicks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-top-picks", {
        body: {},  // empty body — uses cache if <7 days old
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: Infinity,  // explicit invalidation only
  });

  const handleRefreshTopPicks = async () => {
    setTopPicksRefreshing(true);
    setTopPicksError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-top-picks", {
        body: { force_refresh: true },
      });
      if (error) throw error;
      queryClient.setQueryData(["topPicks", user?.id], data);
    } catch (err) {
      console.error("[top-picks] refresh failed:", err);
      setTopPicksError("Couldn't refresh — try again in a few seconds.");
    } finally {
      setTopPicksRefreshing(false);
    }
  };

  const topPicks = topPicksQuery.data?.jobs ?? [];
  const topPicksFromCache = !!topPicksQuery.data?.from_cache;
  const topPicksEmptyReason = topPicksQuery.data?.empty_reason;

  // ── Browse ────────────────────────────────────────────────────────
  const [selectedTier, setSelectedTier] = useState("tier_1");
  const [keyword, setKeyword] = useState("");
  const [scoredJobs, setScoredJobs] = useState({});  // jobId → {match_score, matched_skills, ...}
  const [scoringIds, setScoringIds] = useState(new Set());
  const [browseAccumulator, setBrowseAccumulator] = useState([]);  // accumulated across Load More
  const [browseOffset, setBrowseOffset] = useState(0);
  const [browseHasMore, setBrowseHasMore] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState(null);
  const [browseEmptyReason, setBrowseEmptyReason] = useState(null);
  const [browseCountry, setBrowseCountry] = useState(null);

  const fetchBrowse = useCallback(async (tier, offset, append) => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const { data, error } = await supabase.functions.invoke("browse-jobs", {
        body: { tier, offset, limit: BROWSE_PAGE_SIZE },
      });
      if (error) throw error;
      const newJobs = data?.jobs ?? [];
      setBrowseAccumulator((prev) => append ? [...prev, ...newJobs] : newJobs);
      setBrowseHasMore(Boolean(data?.has_more));
      setBrowseEmptyReason(append ? browseEmptyReason : data?.empty_reason ?? null);
      setBrowseCountry(data?.country_code ?? null);
    } catch (err) {
      console.error("[browse-jobs] fetch failed:", err);
      setBrowseError("Couldn't load jobs — try again.");
    } finally {
      setBrowseLoading(false);
    }

  }, []);

  // Re-fetch when tier changes. Reset accumulator + offset + scored cache.
  useEffect(() => {
    if (!user?.id) return;
    setBrowseAccumulator([]);
    setBrowseOffset(0);
    setBrowseHasMore(false);
    setBrowseEmptyReason(null);
    setScoredJobs({});
    fetchBrowse(selectedTier, 0, false);
  }, [selectedTier, user?.id, fetchBrowse]);

  const handleLoadMore = () => {
    const newOffset = browseOffset + BROWSE_PAGE_SIZE;
    setBrowseOffset(newOffset);
    fetchBrowse(selectedTier, newOffset, true);
  };

  // Client-side keyword filter — title + company substring match
  const filteredBrowseJobs = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return browseAccumulator;
    return browseAccumulator.filter((j) =>
      (j.title || "").toLowerCase().includes(k) ||
      (j.company || "").toLowerCase().includes(k)
    );
  }, [browseAccumulator, keyword]);

  // ── Score-this-job: calls analyze-job-match for a single browse card ──
  const handleScoreJob = async (job) => {
    if (scoringIds.has(job.id)) return;
    setScoringIds((prev) => new Set(prev).add(job.id));
    try {
      const { data, error } = await supabase.functions.invoke("analyze-job-match", {
        body: { job_description: job.description, mode: "text" },
      });
      if (error) throw error;
      // analyze-job-match returns matched_requirements + missing_requirements
      // (array of {requirement, ...}). Flatten for the card.
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
      setScoringIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  const noProfile = !profile;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Smart Match Jobs</h1>
        </div>
        <p className="text-sm text-[#A3A3A3]">
          Personalised picks at the top · browse more by tier below.
        </p>
        {stale && (
          <p className="text-xs text-amber-700 mt-1">
            Profile updated since last analysis ·{" "}
            <Link to={createPageUrl("CareerRoadmap")} className="underline hover:text-amber-800">
              refresh roadmap
            </Link>
          </p>
        )}
      </div>

      {noProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700 mb-6">
          Complete your onboarding first so we can find personalised job matches.
        </div>
      )}

      {/* ─── Top Picks ─── */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Top Picks for You</h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              {topPicksFromCache ? "Cached — refreshes weekly" : "Just generated"}
              {topPicksQuery.data?.country_code && ` · ${topPicksQuery.data.country_code.toUpperCase()}`}
            </p>
          </div>
          <Button
            onClick={handleRefreshTopPicks}
            disabled={topPicksRefreshing || topPicksQuery.isLoading || noProfile}
            variant="outline"
            size="sm">
            {topPicksRefreshing ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Refreshing</>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh</>
            )}
          </Button>
        </div>

        {topPicksError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-3">
            {topPicksError}
          </div>
        )}

        {topPicksQuery.isLoading ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E5E5E5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#A3A3A3] mx-auto mb-2" />
            <p className="text-sm text-[#525252]">Loading your top picks…</p>
          </div>
        ) : topPicks.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-[#E5E5E5]">
            <Briefcase className="w-8 h-8 text-[#A3A3A3] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#525252]">
              {topPicksEmptyReason === "no_roles"
                ? "Run your Career Roadmap first to get personalised picks."
                : "No matches found right now — try refreshing."}
            </p>
            {topPicksEmptyReason === "no_roles" && (
              <Link to={createPageUrl("CareerRoadmap")} className="inline-block mt-3 text-xs text-[#0A66C2] hover:underline">
                Go to Career Roadmap →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topPicks.map((job, i) => (
              <TopPickCard key={job.id || `${job.title}-${i}`} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Browse Jobs ─── */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A0A0A] mb-4">Browse Jobs</h2>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {TIER_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTier(t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedTier === t
                  ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                  : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
              }`}>
              {TIER_LABELS[t]}
            </button>
          ))}
          <div className="relative flex-1 min-w-[200px] max-w-[320px] ml-auto">
            <Search className="w-3.5 h-3.5 text-[#A3A3A3] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Filter by title or company"
              className="text-sm pl-8"
            />
          </div>
        </div>

        {browseError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-3">
            {browseError}
          </div>
        )}

        {browseLoading && browseAccumulator.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E5E5E5]">
            <Loader2 className="w-6 h-6 animate-spin text-[#A3A3A3] mx-auto mb-2" />
            <p className="text-sm text-[#525252]">Loading jobs…</p>
          </div>
        ) : filteredBrowseJobs.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-[#E5E5E5]">
            <Briefcase className="w-8 h-8 text-[#A3A3A3] mx-auto mb-3" />
            {keyword ? (
              <p className="text-sm font-medium text-[#525252]">No matches for &quot;{keyword}&quot; in the loaded jobs.</p>
            ) : browseEmptyReason === "no_roles_in_tier" ? (
              <>
                <p className="text-sm font-medium text-[#525252]">
                  No {TIER_LABELS[selectedTier]} roles yet — run your Career Roadmap.
                </p>
                <Link to={createPageUrl("CareerRoadmap")} className="inline-block mt-3 text-xs text-[#0A66C2] hover:underline">
                  Go to Career Roadmap →
                </Link>
              </>
            ) : browseEmptyReason === "no_jobs_for_country" ? (
              <p className="text-sm font-medium text-[#525252]">
                We don&apos;t have live job data for {browseCountry?.toUpperCase() || "your country"} yet.
              </p>
            ) : (
              <p className="text-sm font-medium text-[#525252]">No jobs in this tier right now.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBrowseJobs.map((job) => (
                <BrowseJobCard
                  key={job.id}
                  job={job}
                  scoreResult={scoredJobs[job.id]}
                  scoring={scoringIds.has(job.id)}
                  onScore={() => handleScoreJob(job)}
                />
              ))}
            </div>
            {browseHasMore && !keyword && (
              <div className="text-center mt-6">
                <Button onClick={handleLoadMore} disabled={browseLoading} variant="outline" size="sm">
                  {browseLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Loading</> : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
