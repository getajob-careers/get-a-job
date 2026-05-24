import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { scoreApplication } from "@/lib/scoreApplication";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ExternalLink, MapPin, CheckCircle2, PlusCircle, Clock, Briefcase,
} from "lucide-react";

const SENIORITY_LABEL = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  director: "Director",
  executive: "Exec",
};

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
  // >30 days → relative months for consistency (no locale-specific date strings).
  const months = Math.floor(ageDays / 30);
  return `${months}mo ago`;
}

// Idempotent insert into applications. Matches on (ats_source, external_id)
// for jobs added from Browse; falls back to title-only for manual rows.
//
// PR-D: persist the full scoreResult (fit_score + track + alignment) at
// insert time when available, so the Tracker shows the SAME numbers the
// Jobs page card just showed — no second LLM round-trip, no async fill-in
// of the track column. The job_id link is set so any future re-score
// (e.g. JD edit on the application) takes the deterministic path.
async function addJobToTracker({ user, queryClient, job, scoreResult }) {
  let dupQuery = supabase.from("applications").select("id").eq("user_id", user.id).limit(1);
  if (job.ats_source && job.external_id) {
    dupQuery = dupQuery.eq("ats_source", job.ats_source).eq("external_id", job.external_id);
  } else {
    dupQuery = dupQuery.ilike("role_title", job.title);
  }
  const { data: existing } = await dupQuery;
  if (existing?.length > 0) return { duplicate: true };

  const jd = job.description || "";
  const hasScore = scoreResult && typeof scoreResult.fit_score === "number";
  const matchedSkills = scoreResult?.signals?.matched_skills || [];
  const matchReason = (scoreResult?.reasoning?.strengths || []).join(" · ");
  const { data: inserted, error } = await supabase.from("applications").insert({
    user_id: user.id,
    role_title: job.title,
    company: job.company_name || "Unknown",
    status: "interested",
    source: "job_suggestion",
    ats_source: job.ats_source || null,
    external_id: job.external_id || null,
    job_id: job.id || null,
    cv_skills_emphasized: matchedSkills,
    job_description: jd,
    url: job.apply_url || "",
    location: job.location_city || job.location_raw || "",
    notes: matchReason,
    ...(hasScore && {
      qualification_score: scoreResult.fit_score,
      goal_alignment_score: scoreResult.goal_alignment_score ?? null,
      track: scoreResult.track,
      score_source: "deterministic",
    }),
  }).select("id").single();

  if (error) {
    console.error("Failed to add to tracker:", error);
    return { error };
  }
  queryClient.invalidateQueries({ queryKey: ["applications"] });
  // Only re-score from scratch when we couldn't write a deterministic result
  // (no scoreResult was passed) AND we have a JD to feed the fallback path.
  if (inserted?.id && jd && !hasScore) {
    scoreApplication(supabase, queryClient, inserted.id, jd, user.id);
  }
  return { ok: true };
}

// `trackColor` (optional) — when provided ("green" | "gray" | "amber"), the
// card gets a 3px accent stripe at the top in that track's color. Set in
// track mode by Jobs.jsx based on the currently-selected track. In keyword
// mode it's null and no stripe renders.
export default function JobCard({ job, scoreResult, trackColor }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  // Collapsible JD preview. Most users scan the card; the JD is here for
  // the few who want to verify what the score is based on before clicking
  // See Job Posting or Track. Workday rows have null description (per ATS scraper
  // audit) — the toggle won't render when description is missing.
  const [showJD, setShowJD] = useState(false);

  const posted = formatPostedDate(job.date_posted);
  const chip = experienceChipText(job);
  const hasDescription = Boolean(job.description && job.description.length > 50);

  // scoreResult shape comes from src/lib/scoreJobFit.js (PR-C):
  //   { fit_score: 0..1, track, signals: {...}, reasoning: { strengths, gaps } }
  // Deterministic, computed on render — no async, no button, always present
  // when the parent passed a profile + job to score.
  const scored = !!scoreResult;
  const score = scored ? Math.round((scoreResult.fit_score ?? 0) * 100) : null;
  const matchedSkills = scoreResult?.signals?.matched_skills || [];
  const missingCoreSkills = scoreResult?.signals?.missing_core_skills || [];
  const reasonText = (scoreResult?.reasoning?.strengths || []).join(" · ");
  // Three bands; <50% is GRAY (not red) — a 45% match is "stretch possible",
  // not "disaster". Red was punitive for the kinds of roles a user would
  // want to score against. PR #92 (Jobs Direction 3) softened this.
  const scoreClass = score == null
    ? ""
    : score >= 75 ? "jb-match-strong"
    : score >= 50 ? "jb-match-medium"
    : "jb-match-soft";

  const handleAdd = async () => {
    setAdding(true);
    const res = await addJobToTracker({ user, queryClient, job, scoreResult });
    setAdding(false);
    if (res.ok || res.duplicate) setAdded(true);
  };

  const trackClass = trackColor ? `jb-track-${trackColor}` : "";

  return (
    <div
      className={`jb-job-card ${trackClass}`}
      data-track-color={trackColor || undefined}
    >
      <div className="jb-job-card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="jb-job-card-title truncate">{job.title}</h3>
            <p className="jb-job-card-company">{job.company_name}</p>
          </div>
          {scored && (
            <span className={`jb-match-badge ${scoreClass}`}>
              {score}% match
            </span>
          )}
        </div>

        <div className="jb-job-card-meta">
          {job.location_city && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location_city}</span>
          )}
          <span className="jb-job-card-meta-chip">{chip}</span>
          {posted && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{posted}</span>
          )}
        </div>

        {scored && reasonText && (
          <p className="text-xs text-[#52545A] leading-relaxed">{reasonText}</p>
        )}
        {scored && matchedSkills.length > 0 && (
          <div>
            <p className="jb-eyebrow mb-1.5">Your strengths</p>
            <div className="flex flex-wrap gap-1.5">
              {matchedSkills.slice(0, 5).map((s, i) => (
                <span key={i} className="jb-skill-pill jb-skill-pill-matched">{s}</span>
              ))}
            </div>
          </div>
        )}
        {scored && missingCoreSkills.length > 0 && (
          <div>
            <p className="jb-eyebrow mb-1.5">Skill gaps</p>
            <div className="flex flex-wrap gap-1.5">
              {missingCoreSkills.slice(0, 5).map((s, i) => (
                <span key={i} className="jb-skill-pill jb-skill-pill-missing">{s}</span>
              ))}
            </div>
          </div>
        )}
        {hasDescription && (
          <div>
            <button
              type="button"
              onClick={() => setShowJD((v) => !v)}
              className="jb-eyebrow inline-flex items-center gap-1 hover:text-[#0E1014] transition-colors cursor-pointer"
              aria-expanded={showJD}
            >
              {showJD ? "Hide" : "View"} job description
              <span aria-hidden="true">{showJD ? "▲" : "▼"}</span>
            </button>
            {showJD && (
              <p className="text-[11px] text-[#52545A] leading-relaxed whitespace-pre-line mt-1.5 max-h-56 overflow-y-auto pr-2">
                {job.description}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="jb-job-card-footer">
        {job.apply_url ? (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="jb-see-posting-link">
            <Briefcase className="w-3.5 h-3.5" />See Job Posting<ExternalLink className="w-3 h-3" />
          </a>
        ) : <span />}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || added}
            className={`jb-btn jb-btn-sm ${added ? "jb-btn-success" : "jb-btn-primary"}`}
          >
            {adding ? (
              <><Loader2 className="w-3 h-3 animate-spin" />Adding…</>
            ) : added ? (
              <><CheckCircle2 className="w-3 h-3" />Added</>
            ) : (
              <><PlusCircle className="w-3 h-3" />Track</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
