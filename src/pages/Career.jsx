/*
 * Career.jsx — Roadmap + Jobs condensed into one surface, per the
 * seamless-ia design handoff (screen 2 / prototype variation A):
 * selectable track band → live-jobs pane (left) + "Your matched roles"
 * why-panel (right). Selecting a track re-filters both panes.
 *
 * Data contracts reused from Jobs.jsx / Roadmap.jsx — same canonical
 * query keys (careerRoles, experiences, education), the same
 * search_jobs_by_role_titles RPC + column select, scoreJobFit with the
 * same { profile, experiences, educations } input, and the idempotent
 * addJobToTracker from JobCard. The old /Roadmap and /Jobs routes stay
 * alive (deep links + roadmap generation live there); this page is the
 * new nav destination.
 *
 * v1 deviation, on purpose: the seniority pre-filter (allowedSeniorities
 * + seniorityFilterFor) stays internal to Jobs.jsx; here the RPC runs
 * unfiltered and the deterministic scorer's track/fit output drives
 * display instead. Low-fit roles render dimmed with no actions rather
 * than being hidden.
 */

import React, { useState, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Rocket, Headphones, TrendingUp, Search, HelpCircle, Check, Plus,
  ChevronDown, ChevronUp, ChevronRight, ExternalLink, Loader2,
} from "lucide-react";
import RdCard from "@/components/redesign/RdCard";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import { scoreJobFit } from "@/lib/scoreJobFit";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import { addJobToTracker } from "@/components/jobs/JobCard";

const TRACK_SIMILARITY_THRESHOLD = 0.3;
const MAX_TRACK_ROLES = 8;
const JOBS_PAGE_SIZE = 20;

// Band styling per track — canonical rdColor mapping (T1 coral · T2 teal ·
// T3 golden) from TRACK_CONFIG, expressed as static Tailwind classes so
// the JIT compiler sees them.
const TRACK_BAND = [
  {
    key: "track_1", icon: Rocket,
    circle: "bg-rd-coral", tintBg: "bg-rd-coral-tint", ink: "text-rd-coral-dark",
    activeBorder: "border-rd-coral", dot: "bg-rd-coral",
    barFill: "bg-rd-coral", barTrack: "bg-rd-coral-tint",
  },
  {
    key: "track_2", icon: Headphones,
    circle: "bg-rd-teal", tintBg: "bg-rd-teal-tint", ink: "text-rd-teal-dark",
    activeBorder: "border-rd-teal", dot: "bg-rd-teal",
    barFill: "bg-rd-teal", barTrack: "bg-rd-teal-tint",
  },
  {
    key: "track_3", icon: TrendingUp,
    circle: "bg-rd-golden", tintBg: "bg-rd-golden-tint", ink: "text-rd-golden-dark",
    activeBorder: "border-rd-golden", dot: "bg-rd-golden",
    barFill: "bg-rd-golden", barTrack: "bg-rd-golden-tint",
  },
];

const FIT_LABELS = { track_1: "strong fit", track_2: "doable detour", track_3: "stretch" };

function matchBadgeClasses(pct) {
  if (pct >= 75) return "bg-rd-coral-tint text-rd-coral-dark";
  if (pct >= 50) return "bg-rd-teal-tint text-rd-teal-dark";
  return "bg-rd-bg-soft text-rd-text-tertiary";
}

function jobAgeChip(datePosted) {
  if (!datePosted) return null;
  const days = Math.floor((Date.now() - new Date(datePosted).getTime()) / 86400000);
  if (Number.isNaN(days) || days < 0) return null;
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function Career() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTrack, setSelectedTrack] = useState("track_1");
  const [whyOpen, setWhyOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [trackedIds, setTrackedIds] = useState(() => new Set());
  const [expandedRoleId, setExpandedRoleId] = useState(null);

  const { data: profile } = useProfileQuery(user?.id);
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: educations = [] } = useEducationQuery(user?.id);

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("career_roles").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const rolesByTrack = useMemo(() => {
    const out = { track_1: [], track_2: [], track_3: [] };
    for (const r of roles) {
      if (out[r.track]) out[r.track].push(r);
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    }
    return out;
  }, [roles]);

  const trackTitles = useMemo(() => {
    const out = {};
    for (const k of Object.keys(rolesByTrack)) {
      out[k] = rolesByTrack[k].slice(0, MAX_TRACK_ROLES).map((r) => r.title).filter(Boolean);
    }
    return out;
  }, [rolesByTrack]);

  // Per-track uncapped live counts for the band meta — same RPC the Home
  // hero stat uses, fired once per track that has titles.
  const liveCounts = useQuery({
    queryKey: ["career_track_counts", user?.id, trackTitles.track_1?.join("|"), trackTitles.track_2?.join("|"), trackTitles.track_3?.join("|")],
    queryFn: async () => {
      const counts = {};
      for (const k of ["track_1", "track_2", "track_3"]) {
        const titles = trackTitles[k];
        if (!titles || titles.length === 0) { counts[k] = null; continue; }
        const { data, error } = await /** @type {any} */ (supabase).rpc("count_active_jobs_by_role_titles", {
          p_role_titles: titles,
          p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
        });
        if (error) { counts[k] = null; continue; }
        const n = Array.isArray(data) ? data[0] : data;
        counts[k] = typeof n === "number" ? n : null;
      }
      return counts;
    },
    enabled: !!user?.id && roles.length > 0,
    staleTime: 5 * 60 * 1000,
  }).data || {};

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["career_jobs", user?.id, selectedTrack, (trackTitles[selectedTrack] || []).join("|")],
    queryFn: async () => {
      const titles = trackTitles[selectedTrack] || [];
      if (titles.length === 0) return [];
      const workTypes = Array.isArray(profile?.work_type) ? profile.work_type : [];
      const { data, error } = await supabase
        .rpc("search_jobs_by_role_titles", {
          p_role_titles: titles,
          p_limit: JOBS_PAGE_SIZE,
          p_offset: 0,
          p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
          p_max_seniority: null,
          p_work_types: workTypes.length > 0 ? workTypes : null,
        })
        .select("id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && roles.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const scoredJobs = useMemo(() => {
    const input = { profile, experiences, educations };
    const list = jobs.map((j) => {
      const result = scoreJobFit(input, j);
      const pct = Math.round((result.fit_score ?? 0) * 100);
      return { job: j, result, pct, low: pct < 50 };
    });
    list.sort((a, b) => b.pct - a.pct);
    return list;
  }, [jobs, profile, experiences, educations]);

  const visibleJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scoredJobs;
    return scoredJobs.filter(({ job }) =>
      (job.title || "").toLowerCase().includes(q) || (job.company_name || "").toLowerCase().includes(q),
    );
  }, [scoredJobs, search]);

  const band = TRACK_BAND.find((t) => t.key === selectedTrack);
  const trackRoles = rolesByTrack[selectedTrack] || [];
  const goalName = profile?.five_year_role || "your 5-year goal";
  const trackNumber = TRACK_CONFIG[selectedTrack]?.number ?? 1;

  // First matched role opens by default whenever the track changes.
  const effectiveExpandedId =
    expandedRoleId && trackRoles.some((r) => r.id === expandedRoleId)
      ? expandedRoleId
      : trackRoles[0]?.id ?? null;

  const handleTrack = async (job, scoreResult) => {
    setTrackedIds((prev) => new Set(prev).add(job.id));
    try {
      await addJobToTracker({ user, queryClient, job, scoreResult });
    } catch {
      setTrackedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  if (loadingRoles) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-rd-text-secondary" />
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display font-extrabold text-[26px] tracking-tight text-rd-text">Career</h1>
        <RdCard className="mt-6 p-8 text-center">
          <p className="font-display font-bold text-[18px] text-rd-text">Generate your roadmap first</p>
          <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-md mx-auto">
            Your tracks, matched roles, and live jobs all come from your career analysis.
          </p>
          <Link
            to={createPageUrl("Roadmap")}
            className="inline-flex items-center gap-1.5 mt-5 bg-rd-coral text-white font-display font-semibold text-[13px] rounded-full px-5 py-2.5"
          >
            Generate roadmap <ChevronRight className="w-4 h-4" />
          </Link>
        </RdCard>
      </div>
    );
  }

  return (
    <div className="max-w-[1080px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-[26px] leading-[1.1] tracking-tight text-rd-text">Career</h1>
          <p className="text-[12.5px] text-rd-text-secondary mt-1">
            Your tracks, the roles you match, and the live jobs on them — one place.
          </p>
        </div>
        <button
          onClick={() => setWhyOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-rd-bg-soft rounded-full px-3.5 py-2 font-display font-semibold text-[12px] text-rd-text-secondary hover:text-rd-text transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" /> How tracks work
        </button>
      </div>

      {whyOpen && (
        <div className="bg-rd-bg-soft rounded-[14px] mt-3 px-4 py-3 text-[12px] leading-[1.55] text-rd-text-tertiary">
          Every role is placed by two things — how <b className="text-rd-text">qualified</b> you are now, and
          whether it moves you toward <b className="text-rd-text">{goalName}</b>. Track 1 is the sweet spot:
          apply there first. Track 2 is a doable detour; Track 3 is what you grow into.
        </div>
      )}

      {/* Track band — the roadmap, condensed */}
      <div className="grid grid-cols-3 gap-2.5 mt-4">
        {TRACK_BAND.map((t) => {
          const cfg = TRACK_CONFIG[t.key];
          const TIcon = t.icon;
          const active = t.key === selectedTrack;
          const count = liveCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setSelectedTrack(t.key)}
              className={[
                "min-w-0 text-left rounded-[14px] px-3 py-2.5 border-[1.5px] transition-colors",
                active ? `${t.tintBg} ${t.activeBorder}` : "bg-rd-bg-card border-rd-border hover:border-rd-border-hover",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <span className={`w-[26px] h-[26px] rounded-full ${t.circle} flex items-center justify-center flex-shrink-0`}>
                  <TIcon className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="min-w-0">
                  <span className={`block font-display font-bold text-[13px] truncate ${active ? t.ink : "text-rd-text"}`}>
                    {cfg.name}
                  </span>
                  <span className={`block text-[10.5px] truncate ${active ? t.ink : "text-rd-text-secondary"}`}>
                    T{cfg.number} · {FIT_LABELS[t.key]} · {(rolesByTrack[t.key] || []).length} roles
                    {typeof count === "number" ? ` · ${count} live` : ""}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mt-4 items-start">
        {/* Left — live jobs */}
        <div className="w-full md:flex-[1.55] min-w-0">
          <div className="relative">
            <Search className="w-4 h-4 text-rd-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${TRACK_CONFIG[selectedTrack].name} roles…`}
              className="w-full bg-rd-bg-card border border-rd-border rounded-[10px] pl-10 pr-4 py-2.5 text-[13px] text-rd-text placeholder:text-rd-text-secondary focus:outline-none focus:border-rd-coral focus:ring-[3px] focus:ring-rd-coral-tint"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="font-display font-bold text-[13.5px] text-rd-text">
              {typeof liveCounts[selectedTrack] === "number"
                ? `${liveCounts[selectedTrack]} live roles on Track ${trackNumber}`
                : `Live roles on Track ${trackNumber}`}
            </span>
            <span className="text-[10.5px] text-rd-text-secondary">refreshed nightly</span>
          </div>
          <div className="flex flex-col gap-2.5 mt-2.5">
            {loadingJobs && (
              <RdCard className="p-6 text-center text-[12.5px] text-rd-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin inline-block mr-2 align-[-2px]" />
                Matching live jobs…
              </RdCard>
            )}
            {!loadingJobs && visibleJobs.length === 0 && (
              <RdCard className="p-6 text-center text-[12.5px] text-rd-text-secondary">
                {search ? "No live roles match that search." : "No live matches on this track right now — check back tomorrow."}
              </RdCard>
            )}
            {visibleJobs.map(({ job, result, pct, low }) => {
              const tracked = trackedIds.has(job.id);
              const chips = [
                job.is_remote ? "Remote" : job.location_city || job.location_raw || null,
                job.seniority || null,
                jobAgeChip(job.date_posted),
              ].filter(Boolean);
              return (
                <div
                  key={job.id}
                  className={`bg-rd-bg-card border border-rd-border rounded-[14px] px-3.5 py-3 hover:border-rd-border-hover transition-colors ${low ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`w-9 h-9 rounded-[9px] ${band.tintBg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`font-display font-bold text-[14px] ${band.ink}`}>
                        {(job.company_name || job.title || "?").charAt(0).toUpperCase()}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-[13.5px] leading-[1.2] text-rd-text">{job.title}</p>
                      <p className="text-[11px] text-rd-text-secondary truncate">
                        {[job.company_name, job.is_remote ? "Remote" : job.location_city || job.location_raw].filter(Boolean).join(" · ")}
                      </p>
                      {chips.length > 0 && (
                        <span className="flex gap-1.5 mt-1.5 flex-wrap">
                          {chips.map((c, i) => (
                            <span key={i} className="text-[10.5px] bg-rd-bg-soft text-rd-text-secondary rounded-[6px] px-2 py-0.5">
                              {c}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <span className={`font-display font-extrabold text-[12px] rounded-full px-2.5 py-1 flex-shrink-0 ${matchBadgeClasses(pct)}`}>
                      {pct}%
                    </span>
                  </div>
                  {low ? (
                    <p className="text-[10.5px] text-rd-text-tertiary mt-2">
                      Low fit — shown for completeness, not recommended.
                    </p>
                  ) : (
                    <div className="flex justify-end gap-2 mt-2.5">
                      <button
                        onClick={() => handleTrack(job, result)}
                        disabled={tracked}
                        className={[
                          "inline-flex items-center gap-1 font-display font-semibold text-[12px] rounded-full px-3.5 py-1.5 transition-colors",
                          tracked ? "bg-rd-teal text-white" : "bg-rd-bg-soft text-rd-text hover:bg-rd-border-subtle",
                        ].join(" ")}
                      >
                        {tracked ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {tracked ? "In pipeline" : "Track"}
                      </button>
                      {job.apply_url && (
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-rd-coral text-white font-display font-semibold text-[12px] rounded-full px-3.5 py-1.5 hover:bg-rd-coral-dark transition-colors"
                        >
                          Apply <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — matched roles why-panel */}
        <div className="w-full md:flex-1 min-w-0 bg-rd-bg-page border border-rd-border-subtle rounded-[16px] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display font-bold text-[14px] text-rd-text">Your matched roles</span>
            <span className="text-[10.5px] text-rd-text-secondary">Track {trackNumber}</span>
          </div>
          <p className="text-[10.5px] leading-[1.5] text-rd-text-tertiary mb-2.5">
            Why you&apos;re matched: every role is scored on two axes — how{" "}
            <b className="text-rd-text">qualified</b> you are now, and how well it{" "}
            <b className="text-rd-text">moves you toward {goalName}</b>.
          </p>
          <div className="flex flex-col gap-2">
            {trackRoles.length === 0 && (
              <p className="text-[12px] text-rd-text-secondary px-1 py-2">No roles on this track yet.</p>
            )}
            {trackRoles.map((r) => {
              const expanded = r.id === effectiveExpandedId;
              // RULINGS.md (e): null score columns NEVER render as 0%.
              // Compute "available" from the raw nulls (not from the
              // coalesced fallback) so a genuinely-missing column omits
              // its bar entirely. readiness_score is allowed to fall
              // back to match_score for display — both being null is
              // the only case that omits the qualified bar.
              const qualifiedRaw = r.readiness_score ?? r.match_score;
              const qualifiedAvailable = qualifiedRaw !== null && qualifiedRaw !== undefined;
              const pathAvailable = r.goal_alignment_score !== null && r.goal_alignment_score !== undefined;
              const qualified = Math.round(qualifiedRaw ?? 0);
              const path = Math.round(r.goal_alignment_score ?? 0);
              const matched = (r.matched_skills || []).slice(0, 4);
              const gaps = (r.missing_skills || []).slice(0, 3);
              return (
                <div key={r.id} className="bg-rd-bg-card border border-rd-border rounded-[12px] overflow-hidden">
                  <button
                    onClick={() => setExpandedRoleId(expanded ? `closed-${r.id}` : r.id)}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${band.dot} flex-shrink-0`} />
                    <span className="flex-1 min-w-0 font-display font-bold text-[12.5px] leading-[1.25] text-rd-text">
                      {r.title}
                    </span>
                    {typeof r.match_score === "number" && (
                      <span className={`font-display font-extrabold text-[11px] rounded-full px-2 py-0.5 ${band.tintBg} ${band.ink}`}>
                        {Math.round(r.match_score)}%
                      </span>
                    )}
                    {expanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-rd-text-secondary flex-shrink-0" />
                    )}
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3">
                      {(qualifiedAvailable || pathAvailable) && (
                        <div className="flex flex-col gap-1.5">
                          {qualifiedAvailable && (
                            <AxisBar label="Qualified now" value={qualified} fill={band.barFill} track={band.barTrack} />
                          )}
                          {pathAvailable && (
                            <AxisBar label={`Moves you to ${goalName}`} value={path} fill={band.barFill} track={band.barTrack} />
                          )}
                        </div>
                      )}
                      {(matched.length > 0 || gaps.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {matched.map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 text-[10px] bg-rd-teal-tint text-rd-teal-dark rounded-[6px] px-2 py-0.5">
                              <Check className="w-2.5 h-2.5" /> {humanizeSkillId(s)}
                            </span>
                          ))}
                          {gaps.map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 text-[10px] bg-rd-golden-tint text-rd-golden-dark rounded-[6px] px-2 py-0.5">
                              <Plus className="w-2.5 h-2.5" /> {humanizeSkillId(s)}
                            </span>
                          ))}
                        </div>
                      )}
                      <Link
                        to={createPageUrl("Roadmap")}
                        className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-medium text-rd-coral-dark hover:text-rd-text transition-colors"
                      >
                        Full role detail <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AxisBar({ label, value, fill, track }) {
  // RULINGS.md (b): explanatory axes render as bars with NO numerals.
  // The bar fill is the sole carrier of magnitude; the label names the
  // axis. Removing the trailing percent span here is the load-bearing
  // edit — keep it that way.
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-rd-text-secondary w-[104px] flex-shrink-0">{label}</span>
      <span className={`flex-1 h-1.5 rounded-full ${track} overflow-hidden`}>
        <span className={`block h-full rounded-full ${fill}`} style={{ width: `${v}%` }} />
      </span>
    </div>
  );
}
