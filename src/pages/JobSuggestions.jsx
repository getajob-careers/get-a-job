import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { scoreApplication } from "@/lib/scoreApplication";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, ExternalLink, Briefcase, MapPin, CheckCircle2, PlusCircle, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { isAnalysisStale } from "@/lib/staleAnalysis";

const TIER_LABELS = {
  tier_1: "Your Move",
  tier_2: "Plan B",
  tier_3: "Work Toward",
};
const TIER_ORDER = ["tier_1", "tier_2", "tier_3"];

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}

function JobCard({ job }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const matchScoreRaw = job.match_score || 0;
  const matchScore = matchScoreRaw <= 1 && matchScoreRaw > 0 ? Math.round(matchScoreRaw * 100) : Math.round(matchScoreRaw);

  const handleAddToTracker = async () => {
    setAdding(true);
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .ilike("role_title", job.title)
      .limit(1);
    if (existing?.length > 0) {
      setAdding(false);
      setAdded(true);
      return;
    }
    const jd = job.description_snippet || "";
    // Tier is left unset on insert; scoreApplication fills it in from the
    // JD-derived qualification_score so users see a single correct tier
    // rather than a title-based guess that shifts after scoring.
    const { data: inserted, error: insertError } = await supabase.from("applications").insert({
      user_id: user.id,
      role_title: job.title,
      company: job.company || "Unknown",
      status: "interested",
      source: 'job_suggestion',
      cv_skills_emphasized: job.matched_skills || [],
      job_description: jd,
      url: job.job_url || "",
      location: job.location || "",
      notes: job.match_reason || "",
    }).select("id").single();
    setAdding(false);
    if (insertError) {
      console.error("Failed to add to tracker:", insertError);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    setAdded(true);
    // Background-score against the JD so AI Confidence appears ~5s later.
    if (inserted?.id) scoreApplication(supabase, queryClient, inserted.id, jd, user.id);
  };

  const matchColor = matchScore >= 75 ? "text-emerald-600 bg-emerald-50" : matchScore >= 50 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 hover:border-[#D4D4D4] transition-all flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#0A0A0A]">{job.title}</h3>
          <p className="text-sm text-[#525252] mt-0.5">{job.company}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${matchColor}`}>
          {matchScore}% match
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-[#A3A3A3] mb-3">
        {job.location && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
        )}
        {salary && (
          <span className="flex items-center gap-1">{salary}</span>
        )}
      </div>

      <p className="text-xs text-[#525252] leading-relaxed mb-3">{job.match_reason}</p>

      {job.missing_skills?.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">Skill Gaps</p>
          <div className="flex flex-wrap gap-1.5">
            {job.missing_skills.map((skill, i) => (
              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {job.matched_skills?.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">Your Strengths</p>
          <div className="flex flex-wrap gap-1.5">
            {job.matched_skills.slice(0, 5).map((skill, i) => (
              <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">{skill}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F5F5F5]">
        {job.job_url ? (
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#0A66C2] hover:underline font-medium"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Apply Now
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : <span />}

        <Button
          size="sm"
          onClick={handleAddToTracker}
          disabled={adding || added}
          className={added ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-[#0A0A0A] hover:bg-[#262626] text-white"}
        >
          {adding ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Adding...</>
          ) : added ? (
            <><CheckCircle2 className="w-3 h-3 mr-1" />Added</>
          ) : (
            <><PlusCircle className="w-3 h-3 mr-1" />Add to Tracker</>
          )}
        </Button>
      </div>
    </div>
  );
}

// Profile-dimension queries (profile, experiences, certifications, projects,
// career_roles) are cached for 30 minutes per visit. Their consumers (this
// page, CareerRoadmap, AddInformation) invalidate on save, so a long staleTime
// avoids redundant refetches on tab switches without serving stale data.
const PROFILE_STALE_TIME = 30 * 60 * 1000;

export default function JobSuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const { data: profile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("experiences").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("certifications").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });

  const stale = isAnalysisStale({ profile, experiences, certifications, projects });

  // Career roadmap tiers — source of the role dropdown. Matching the
  // CareerRoadmap page's query key keeps the cache shared.
  const { data: careerRoles = [] } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("career_roles")
        .select("title, tier, readiness_score, goal_alignment_score")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: PROFILE_STALE_TIME,
  });

  // Cached job_suggestions rows. Edge function writes to this table on
  // force_refresh, then we invalidate this query in generateSuggestions() so
  // it refetches the fresh rows. staleTime: Infinity prevents accidental
  // refetches on revisits — invalidation is explicit and edge-function-driven.
  const { data: suggestionsData } = useQuery({
    queryKey: ["jobSuggestions", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("job_suggestions")
        .select("*")
        .eq("user_id", user.id)
        .order("match_score", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return null;

      const live = data.filter((s) => s.suggestion_type === "live" || (s.suggestion_type !== "generic" && s.job_url));
      const generic = data
        .filter((s) => s.suggestion_type === "generic" || (!s.job_url && s.suggestion_type !== "live"))
        .map((s) => ({
          ...s,
          why_good_fit: s.match_reason || s.description_snippet,
          key_skills_to_highlight: s.matched_skills || [],
          tier: (s.match_score || 0) >= 70 ? "tier_1" : "tier_2",
        }));

      return { live, generic, lastGeneratedISO: data[0].fetched_at };
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  const jobs = suggestionsData?.live ?? [];
  const genericJobs = suggestionsData?.generic ?? [];
  const lastGenerated = suggestionsData?.lastGeneratedISO
    ? new Date(suggestionsData.lastGeneratedISO).toLocaleString()
    : null;
  const fromCache = !justGenerated && (jobs.length > 0 || genericJobs.length > 0);

  // Group + sort by tier for the dropdown. Dedupe by title (some users have
  // duplicate entries across regenerations) and sort within a tier by readiness.
  const rolesByTier = useMemo(() => {
    const seen = new Set();
    const groups = { tier_1: [], tier_2: [], tier_3: [] };
    for (const r of careerRoles) {
      if (!r?.title || !groups[r.tier]) continue;
      const key = r.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      groups[r.tier].push(r);
    }
    for (const t of TIER_ORDER) {
      groups[t].sort((a, b) => (Number(b.readiness_score) || 0) - (Number(a.readiness_score) || 0));
    }
    return groups;
  }, [careerRoles]);

  const [selectedRole, setSelectedRole] = useState(null);

  // Default the dropdown to the top Tier 1 role (fall back to T2 → T3 if none).
  useEffect(() => {
    if (selectedRole) return;
    for (const t of TIER_ORDER) {
      if (rolesByTier[t].length > 0) {
        setSelectedRole(rolesByTier[t][0].title);
        return;
      }
    }
  }, [rolesByTier, selectedRole]);

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-job-suggestions", {
        body: {
          force_refresh: true,
          ...(selectedRole && { role_filter: selectedRole }),
        },
      });

      if (error) throw error;

      // Edge function has persisted the new suggestions to job_suggestions.
      // Invalidate the cached query so it refetches the fresh rows; this also
      // guarantees the new data replaces the old in the UI atomically.
      await queryClient.invalidateQueries({ queryKey: ["jobSuggestions", user?.id] });
      setJustGenerated(true);
      setMessage(data?.message || null);
    } catch (err) {
      console.error("Job suggestions error:", err);
      setError("Failed to load job suggestions. Please try again.");
    }
    setLoading(false);
  };

  const noProfile = !profile && !loading;
  const noSkills = profile && (profile.skills || []).length === 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Smart Match Jobs</h1>
        </div>
        <p className="text-sm text-[#A3A3A3]">
          Personalised job listings scored against your profile by AI — updated daily.
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          Complete your onboarding first so we can find personalised job matches.
        </div>
      )}

      {noSkills && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700 mb-6">
          Add skills to your profile (via Add Information) to get better matches.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          {lastGenerated && (
            <p className="text-xs text-[#A3A3A3]">
              {fromCache ? "Cached from" : "Generated at"} {lastGenerated}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {careerRoles.length > 0 && (
            <Select value={selectedRole || ""} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[260px] text-sm" aria-label="Role to search for">
                <SelectValue placeholder="Pick a role to search" />
              </SelectTrigger>
              <SelectContent>
                {TIER_ORDER.map((t) =>
                  rolesByTier[t].length > 0 ? (
                    <SelectGroup key={t}>
                      <SelectLabel>{TIER_LABELS[t]}</SelectLabel>
                      {rolesByTier[t].map((r) => (
                        <SelectItem key={`${t}:${r.title}`} value={r.title}>
                          {r.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null
                )}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() => generateSuggestions()}
            disabled={loading || !profile}
            className="bg-[#0A0A0A] hover:bg-[#262626]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finding Jobs...</>
            ) : jobs.length > 0 ? (
              <><RefreshCw className="w-4 h-4 mr-2" />Refresh Matches</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Find Job Matches</>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700 mb-6">
          {error}
        </div>
      )}

      {message && jobs.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 mb-6">
          {message}
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#A3A3A3] mx-auto mb-4" />
          <p className="text-sm text-[#525252] font-medium">Finding your best job matches...</p>
          <p className="text-xs text-[#A3A3A3] mt-1">Searching live listings and scoring them against your profile. This takes ~15 seconds.</p>
        </div>
      )}

      {jobs.length > 0 && !loading && (
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-[#0A0A0A] mb-4">Live Job Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job, i) => (
              <JobCard key={job.id || job.reed_job_id || i} job={job} />
            ))}
          </div>
        </div>
      )}

      {genericJobs.length > 0 && !loading && (
        <div>
          <h2 className="text-lg font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            What to Look For
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {genericJobs.map((gjob, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-md font-semibold text-[#0A0A0A]">{gjob.title}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${gjob.tier === 'tier_1' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                    {gjob.tier === 'tier_1' ? 'High Match' : 'Upskill Required'}
                  </span>
                </div>
                <p className="text-sm text-[#525252] mb-4 leading-relaxed">{gjob.why_good_fit}</p>
                
                {gjob.key_skills_to_highlight?.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-semibold mb-1.5">Key Skills to Highlight</p>
                    <div className="flex flex-wrap gap-1.5">
                      {gjob.key_skills_to_highlight.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#F5F5F5] text-[#525252] text-xs rounded-full border border-[#E5E5E5]">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(jobs.length === 0 && genericJobs.length === 0) && !loading && !error && !message && profile && (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E5E5E5]">
          <Briefcase className="w-10 h-10 text-[#A3A3A3] mx-auto mb-4" />
          <p className="text-sm font-medium text-[#525252]">No matches yet</p>
          <p className="text-xs text-[#A3A3A3] mt-1">Click "Find Job Matches" to discover roles that fit your profile</p>
        </div>
      )}
    </div>
  );
}