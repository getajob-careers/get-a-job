// Shared display derivation for job cards — the compact JobGridCard and the
// JobDetailModal both read from here so their badges, chips, strengths, and
// gaps stay identical to (and can't drift from) the legacy JobCard.
//
// Pure + presentational only. Mirrors the constants/helpers in JobCard.jsx;
// if you change one, change both (or fold JobCard onto this helper).

import { humanizeSkillId } from "@/lib/humanizeSkillId";

export const RD_TRACK_STYLES = {
  coral:  { tint: "var(--rd-primary-tint)",  accent: "var(--rd-primary-dark)" },
  teal:   { tint: "var(--rd-teal-tint)",   accent: "var(--rd-teal-dark)" },
  golden: { tint: "var(--rd-golden-tint)", accent: "var(--rd-golden-dark)" },
  green:  { tint: "var(--rd-primary-tint)",  accent: "var(--rd-primary-dark)" },
  gray:   { tint: "var(--rd-teal-tint)",   accent: "var(--rd-teal-dark)" },
  amber:  { tint: "var(--rd-golden-tint)", accent: "var(--rd-golden-dark)" },
};

export const BAND_META = {
  strong:  { label: "Strong match", bg: "var(--rd-teal-tint)",   fg: "var(--rd-teal-dark)" },
  good:    { label: "Good match",   bg: "var(--rd-primary-tint)",  fg: "var(--rd-primary-dark)" },
  stretch: { label: "Stretch",      bg: "var(--rd-golden-tint)", fg: "var(--rd-golden-dark)" },
  reach:   { label: "Reach",        bg: "var(--rd-bg-soft)",     fg: "var(--rd-text-secondary)" },
};

// Component 2b direction axis. The for-you feed sorts on rank_score, which boosts
// on-direction (primary) roles, so a lower "qualified now" % can rank above a
// higher one. This is the second visible axis that makes that ordering
// self-explain: attainability = "qualified now", direction = "on your goal path".
// Derived from relevance_match so it is band-independent (a primary role in the
// Stretch section still reads on-direction). The live card renders a quiet tag
// from dot/label; the canvas port reads the same `direction` and applies its own
// treatment, so it lives here (the shared seam), not in either card. unknown/off
// resolve to null (nothing honest to say about direction).
export const DIRECTION_META = {
  primary:  { label: "On your goal path", tone: "primary",  dot: "var(--rd-teal-dark)" },
  adjacent: { label: "Adjacent field",    tone: "adjacent", dot: "var(--rd-golden-dark)" },
};

const SENIORITY_LABEL = {
  entry: "Entry", mid: "Mid", senior: "Senior", lead: "Lead", director: "Director", executive: "Exec",
};

export function matchBand(score) {
  if (score == null) return null;
  if (score >= 75) return "strong";
  if (score >= 50) return "medium";
  return "soft";
}

export function experienceChipText(job) {
  if (job.years_experience_min == null) return SENIORITY_LABEL[job.seniority] || "Mid";
  if (job.years_experience_max != null && job.years_experience_max > job.years_experience_min) {
    return `${job.years_experience_min}-${job.years_experience_max} yrs`;
  }
  if (job.years_experience_min === 0) return "0+ yrs";
  return `${job.years_experience_min}+ yrs`;
}

export function workTypeChipText(job) {
  if (job.is_remote === true) return "Remote";
  if (job.is_remote === false) return job.location_city ? "On-site" : null;
  return null;
}

export function formatPostedDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const ageDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (ageDays <= 0) return "Today";
  if (ageDays === 1) return "Yesterday";
  if (ageDays < 7) return `${ageDays}d ago`;
  if (ageDays < 30) return `${Math.floor(ageDays / 7)}w ago`;
  return `${Math.floor(ageDays / 30)}mo ago`;
}

// Single source of truth for the badge + skills the card/modal render from a
// scoreResult (shape from src/lib/scoreJobFit.js).
export function deriveJobDisplay(job, scoreResult, { showAttainabilityBand = false, trackColor = null } = {}) {
  const scored = !!scoreResult;
  const score = scored ? Math.round((scoreResult.fit_score ?? 0) * 100) : null;
  const attainBand = scored && showAttainabilityBand ? scoreResult.attainability_band || null : null;
  const attainPct = scored && scoreResult.attainability_score != null
    ? Math.round(scoreResult.attainability_score * 100)
    : null;
  const band = matchBand(score);
  const styles = trackColor ? RD_TRACK_STYLES[trackColor] : null;

  const badgeStyle = !scored
    ? null
    : (band === "soft" || !styles)
      ? { background: "var(--rd-bg-soft)", color: "var(--rd-text-secondary)" }
      : { background: styles.tint, color: styles.accent };

  return {
    scored,
    score,
    attainBand,
    attainPct,
    band,
    badgeStyle,
    bandMeta: attainBand ? BAND_META[attainBand] : null,
    direction: scored ? DIRECTION_META[scoreResult.relevance_match] || null : null,
    matchedSkills: (scoreResult?.signals?.matched_skills || []).map(humanizeSkillId),
    missingCoreSkills: (scoreResult?.signals?.missing_core_skills || []).map(humanizeSkillId),
    reasonText: (scoreResult?.reasoning?.strengths || []).join(" · "),
    chips: [workTypeChipText(job), experienceChipText(job), formatPostedDate(job.date_posted)].filter(Boolean),
    // Seniority above the user's stretch ceiling (band already capped to
    // "stretch" in scoreJobFit) - lets the card/modal add a quiet, self-explaining
    // note so an included reach (e.g. Head of Product) reads as honest rather than
    // as a scoring glitch. Pure signal; the render sites decide when to show it.
    aboveCeiling: scored && scoreResult?.signals?.seniority_match === "above_ceiling",
  };
}
