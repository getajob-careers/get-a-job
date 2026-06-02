import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { scoreApplication } from "@/lib/scoreApplication";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  PlusCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";

// PR 3D — JobCard restyled on rd tokens. Behaviour preserved 1:1:
//   - scoreJobFit-derived signals are still rendered (match %, strengths,
//     skill gaps, reason prose).
//   - Track button calls addJobToTracker → idempotent insert into
//     applications with the deterministic scoreResult persisted.
//   - "See Job Posting" → external apply_url link (target="_blank",
//     rel="noopener noreferrer"). Wording preserved.
//   - Collapsible JD preview (hasDescription gate, max-h-56 overflow).
//
// Track-color contract: parent passes the new rdColor string
// ("coral" | "teal" | "golden") that came from
// TRACK_CONFIG[track].rdColor — matches Home + Roadmap. Old
// green/gray/amber strings are still accepted by RD_TRACK_STYLES as
// fallbacks (mapped to the same warm palette) so partial rollout
// doesn't break the card.

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

function workTypeChipText(job) {
  if (job.is_remote === true) return "Remote";
  if (job.is_remote === false) return job.location_city ? "On-site" : null;
  return null;
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
// of the track column. (Previously also wrote a `job_id` foreign key, but
// that column was never added to applications via migration. PostgREST
// silently stripped it for months; a Supabase platform upgrade in May
// 2026 started rejecting the unknown column, breaking the Track button.
// Removed in PR #134 since no code path read it. The (ats_source,
// external_id) pair we still write serves the same join purpose.)
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

// Track-color tints for the redesigned card. Indexed by `rdColor`
// (coral|teal|golden) coming from TRACK_CONFIG. Legacy color names
// (green|gray|amber) map onto the same warm palette as a fallback so a
// stale-cache path doesn't render a colorless card.
const RD_TRACK_STYLES = {
  coral:  { tint: "var(--rd-coral-tint)",  badgeBg: "var(--rd-coral)",  accent: "var(--rd-coral-dark)"  },
  teal:   { tint: "var(--rd-teal-tint)",   badgeBg: "var(--rd-teal)",   accent: "var(--rd-teal-dark)"   },
  golden: { tint: "var(--rd-golden-tint)", badgeBg: "var(--rd-golden)", accent: "var(--rd-golden-dark)" },
  // Legacy alias support — fall back to coral if a stale cache surface
  // passes the old names.
  green:  { tint: "var(--rd-coral-tint)",  badgeBg: "var(--rd-coral)",  accent: "var(--rd-coral-dark)"  },
  gray:   { tint: "var(--rd-teal-tint)",   badgeBg: "var(--rd-teal)",   accent: "var(--rd-teal-dark)"   },
  amber:  { tint: "var(--rd-golden-tint)", badgeBg: "var(--rd-golden)", accent: "var(--rd-golden-dark)" },
};

function matchBand(score) {
  if (score == null) return null;
  if (score >= 75) return "strong";
  if (score >= 50) return "medium";
  return "soft";
}

// `trackColor` (optional) — when provided ("coral" | "teal" | "golden"),
// the card avatar + match badge use that track's tint. Set in track mode
// by Jobs.jsx based on the per-job scoreJobFit track. In keyword mode it
// can be null (no scoreJobFit result) and the card renders neutral.
export default function JobCard({ job, scoreResult = null, trackColor = null }) {
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
  const workChip = workTypeChipText(job);
  const hasDescription = Boolean(job.description && job.description.length > 50);

  // scoreResult shape comes from src/lib/scoreJobFit.js (PR-C):
  //   { fit_score: 0..1, track, signals: {...}, reasoning: { strengths, gaps } }
  // Deterministic, computed on render — no async, no button, always present
  // when the parent passed a profile + job to score.
  const scored = !!scoreResult;
  const score = scored ? Math.round((scoreResult.fit_score ?? 0) * 100) : null;
  const band = matchBand(score);
  const matchedSkills = scoreResult?.signals?.matched_skills || [];
  const missingCoreSkills = scoreResult?.signals?.missing_core_skills || [];
  const reasonText = (scoreResult?.reasoning?.strengths || []).join(" · ");

  const styles = trackColor ? RD_TRACK_STYLES[trackColor] : null;

  // Match-badge style — track-tinted when we have a track; muted neutral
  // for soft (<50%) so a "stretch possible" match doesn't read alarming.
  const badgeStyle = (() => {
    if (!scored) return null;
    if (band === "soft" || !styles) {
      return { background: "var(--rd-bg-soft)", color: "var(--rd-text-secondary)" };
    }
    return { background: styles.tint, color: styles.accent };
  })();

  const handleAdd = async () => {
    setAdding(true);
    const res = await addJobToTracker({ user, queryClient, job, scoreResult });
    setAdding(false);
    if (res.ok || res.duplicate) setAdded(true);
  };

  // Avatar — first letter of company name, tinted to the track color.
  // Mockup signature pattern. Falls back to a neutral gray when no track
  // (keyword mode without scoreJobFit result).
  const avatarLetter = (job.company_name || "?").trim().charAt(0).toUpperCase();
  const avatarStyle = styles
    ? { background: styles.tint, color: styles.accent }
    : { background: "var(--rd-bg-soft)", color: "var(--rd-text-secondary)" };

  // Low-fit warning row at the bottom of the card (when scored < 50% AND
  // we have a fit signal). Mockup uses a dim opacity for soft cards; we
  // surface a one-liner instead so the user understands the card was
  // shown to them but isn't recommended.
  const lowFitWarning = band === "soft";

  return (
    <div
      className="bg-rd-bg-card border border-rd-border rounded-[18px] p-4 sm:p-5 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-rd-border-hover hover:shadow-rd flex flex-col gap-3"
      style={{ boxShadow: "var(--rd-shadow)" }}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={avatarStyle}
        >
          <span className="font-display font-extrabold text-[17px] leading-none">
            {avatarLetter}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-[15px] leading-[1.2] text-rd-text truncate">
            {job.title}
          </h3>
          <p className="text-[11.5px] text-rd-text-secondary mt-0.5 truncate">
            {job.company_name}
            {job.location_city ? ` · ${job.location_city}` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {workChip && <MetaChip>{workChip}</MetaChip>}
            <MetaChip>{chip}</MetaChip>
            {posted && (
              <MetaChip>
                <Clock className="w-2.5 h-2.5" />
                {posted}
              </MetaChip>
            )}
          </div>
        </div>
        {scored && badgeStyle && (
          <span
            className="flex-shrink-0 inline-flex items-center font-display font-extrabold text-[12.5px] rounded-full px-2.5 py-1"
            style={badgeStyle}
          >
            {score}%
          </span>
        )}
      </div>

      {scored && reasonText && (
        <p className="text-[12px] text-rd-text-secondary leading-[1.55]">
          {reasonText}
        </p>
      )}
      {scored && matchedSkills.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1.5">
            Your strengths
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.slice(0, 5).map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rd-teal-tint text-rd-teal-dark"
              >
                <Check className="w-2.5 h-2.5" />
                {humanizeSkillId(s)}
              </span>
            ))}
          </div>
        </div>
      )}
      {scored && missingCoreSkills.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1.5">
            Skill gaps
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingCoreSkills.slice(0, 5).map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rd-bg-soft text-rd-text-tertiary border border-rd-border"
              >
                <X className="w-2.5 h-2.5" />
                {humanizeSkillId(s)}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasDescription && (
        <div>
          <button
            type="button"
            onClick={() => setShowJD((v) => !v)}
            aria-expanded={showJD}
            className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono hover:text-rd-text transition-colors"
          >
            {showJD ? (
              <>
                Hide job description <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                View job description <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
          {showJD && (
            <p className="text-[11.5px] text-rd-text-secondary leading-[1.55] whitespace-pre-line mt-1.5 max-h-56 overflow-y-auto pr-2">
              {job.description}
            </p>
          )}
        </div>
      )}

      {lowFitWarning && (
        <p className="text-[10.5px] text-rd-text-tertiary leading-[1.45] italic">
          Low fit — shown because you searched, not recommended.
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-rd-border-subtle mt-auto">
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || added}
          className="inline-flex items-center gap-1.5 font-display font-semibold text-[12px] rounded-full px-3.5 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={
            added
              ? { background: "var(--rd-teal-tint)", color: "var(--rd-teal-dark)" }
              : { background: "var(--rd-bg-soft)", color: "var(--rd-text-secondary)" }
          }
        >
          {adding ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Adding…
            </>
          ) : added ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Tracked
            </>
          ) : (
            <>
              <PlusCircle className="w-3 h-3" />
              Track
            </>
          )}
        </button>
        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-display font-bold text-[12px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-3.5 py-1.5 transition-colors"
          >
            See Job Posting
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function MetaChip({ children }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] text-rd-text-tertiary bg-rd-bg-soft rounded-md px-2 py-0.5">
      {children}
    </span>
  );
}
