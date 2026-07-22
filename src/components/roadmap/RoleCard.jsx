import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import { humanizeSkillId } from "@/lib/humanizeSkillId";
import { isLowCoverage } from "@/lib/flags";

// Track-color tint palette for the redesign. Each track's `rdColor` maps
// to a {tint, badgeBg, badgeText, accent} so the card identity is set in
// one place. The legacy `track.color` (green/gray/amber) stays on the row
// for non-redesigned consumers (Tracker, JobCard).
const RD_TRACK_STYLES = {
  coral: {
    tint:      "var(--rd-primary-tint)",
    badgeBg:   "var(--rd-primary)",
    badgeText: "#ffffff",
    accent:    "var(--rd-primary-dark)",
  },
  teal: {
    tint:      "var(--rd-teal-tint)",
    badgeBg:   "var(--rd-teal)",
    badgeText: "#ffffff",
    accent:    "var(--rd-teal-dark)",
  },
  golden: {
    tint:      "var(--rd-golden-tint)",
    badgeBg:   "var(--rd-golden)",
    badgeText: "#ffffff",
    accent:    "var(--rd-golden-dark)",
  },
};

// NB: `onTrack` is accepted for backward compatibility with CareerRoadmap's
// handleTrack but no longer wired up — the "Add to Tracker" button was
// removed (users should add specific job postings via Tracker, not generic
// role cards).
export default function RoleCard({ role, onTrack = null }) { // eslint-disable-line no-unused-vars
  const [expanded, setExpanded] = useState(false);
  const track = TRACK_CONFIG[role.track] || TRACK_CONFIG.track_1;
  const styles = RD_TRACK_STYLES[track.rdColor] || RD_TRACK_STYLES.coral;

  // readiness_score is stored 0–1; render as percentage. Allow upstream to
  // pass match_percentage directly.
  const rawScore = role.readiness_score ?? role.match_score;
  // Phase 0 honesty gate (opt-in via ?coverage_gate=1).
  const lowCoverage = isLowCoverage(role.skill_coverage_ratio);
  const matchPercentage = role.match_percentage ?? (
    rawScore != null ? Math.round(Number(rawScore) * 100) : null
  );

  // Per-role track-scoring breakdown — the two axes that determined the track.
  // The WEAKER axis is rendered in a muted "needs-work" tone (NOT coral —
  // coral is now Track 1's identity color). This still draws the eye to
  // "this is the bottleneck" without overloading the brand accent.
  const qualPct = rawScore != null ? Math.round(Number(rawScore) * 100) : null;
  const alignPct = role.goal_alignment_score != null
    ? Math.round(Number(role.goal_alignment_score) * 100)
    : null;
  const showBreakdown = qualPct != null || alignPct != null;
  const qualIsWeak = qualPct != null && alignPct != null && qualPct < alignPct;
  const alignIsWeak = qualPct != null && alignPct != null && alignPct < qualPct;

  // Merge "Reasoning" + "Goal Alignment" if both exist — the two were LLM
  // prose explaining the same outcome from different angles. If only one is
  // present, render that one solo.
  const explainParts = [role.reasoning, role.alignment_to_goal].filter(Boolean);
  const explainText = explainParts.join("\n\n");

  return (
    <div
      className="bg-rd-bg-card border border-rd-border rounded-[18px] overflow-hidden"
      style={{ boxShadow: "var(--rd-shadow)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-rd-bg-soft/40 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <TrackBadge track={track} styles={styles} />
          <div className="min-w-0">
            <p className="font-display font-bold text-[15px] leading-[1.25] text-rd-text truncate">
              {role.title}
            </p>
            <div className="flex items-center gap-2.5 mt-1 text-[12px] text-rd-text-secondary">
              {lowCoverage ? (
                <span title="Our skill library does not deeply cover this field yet, so we are not showing a confident match score.">
                  Limited data for this field yet
                </span>
              ) : matchPercentage != null ? (
                <span>{matchPercentage}% match</span>
              ) : null}
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-display font-semibold"
                style={{ background: styles.tint, color: styles.accent }}
              >
                Track {track.number} · {track.name}
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-rd-text-secondary flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-rd-text-secondary flex-shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div
          className="px-5 pb-5 pt-2 border-t border-rd-border-subtle flex flex-col gap-5"
          style={{ background: "linear-gradient(180deg, " + styles.tint + " 0%, transparent 80px)" }}
        >
          {/* Track breakdown — the two scores that placed this role.
              Weak-axis fill uses a muted ink tone (not coral) so the
              "this is the bottleneck" cue stays without colliding with
              Track 1's identity color. */}
          {showBreakdown && !lowCoverage && (
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2.5">
                Track breakdown
              </p>
              <div className="flex flex-col gap-3">
                {qualPct != null && (
                  <BreakdownBar
                    label="Qualification"
                    pct={qualPct}
                    isWeak={qualIsWeak}
                    strongFill={styles.badgeBg}
                  />
                )}
                {alignPct != null && (
                  <BreakdownBar
                    label="Goal alignment"
                    pct={alignPct}
                    isWeak={alignIsWeak}
                    strongFill={styles.badgeBg}
                  />
                )}
              </div>
            </div>
          )}

          {explainText && (
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">
                Reasoning
              </p>
              <p className="text-[13px] text-rd-text-secondary leading-[1.6] whitespace-pre-line">
                {explainText}
              </p>
            </div>
          )}

          {role.matched_skills?.length > 0 && (
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">
                Matched skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {role.matched_skills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full bg-rd-teal-tint text-rd-teal-dark"
                  >
                    <Check className="w-3 h-3" />
                    {humanizeSkillId(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {role.missing_skills?.length > 0 && (
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">
                Missing skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {role.missing_skills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full bg-rd-bg-soft text-rd-text-tertiary border border-rd-border"
                  >
                    <X className="w-3 h-3" />
                    {humanizeSkillId(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {role.action_items?.length > 0 && (
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-2">
                Action items
              </p>
              <ul className="flex flex-col gap-2">
                {role.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-rd-text leading-[1.55]">
                    <ArrowRight
                      className="w-3.5 h-3.5 flex-shrink-0 mt-1"
                      style={{ color: styles.badgeBg }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bridge to the Career jobs feed filtered to this role title —
              closes the "Roadmap says I'm a fit, but where are the actual
              jobs?" loop by deep-linking into the Search tab with the role
              prefilled (PR3: /Jobs was consolidated into /Career). */}
          {role.title && (
            <Link
              to={`${createPageUrl("Career")}?role=${encodeURIComponent(role.title)}`}
              className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-display font-semibold transition-colors"
              style={{ color: styles.accent }}
            >
              See {role.title} jobs available now
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function TrackBadge({ track, styles }) {
  return (
    <span
      aria-hidden="true"
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: styles.badgeBg }}
    >
      <span
        className="font-display font-extrabold text-[13px] leading-none"
        style={{ color: styles.badgeText }}
      >
        {track.number}
      </span>
    </span>
  );
}

function BreakdownBar({ label, pct, isWeak, strongFill }) {
  // Strong axis → uses the track color so the card identity carries
  // through. Weak axis → muted ink tone (not coral) — coral is now a
  // tier color, so reusing it for "needs work" would create visual
  // collisions. Mid-ink reads as "incomplete" against the warm tint.
  const fill = isWeak ? "var(--rd-text-tertiary)" : strongFill;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-display font-semibold text-rd-text">
          {label}
        </span>
        <span className="text-[12px] font-mono text-rd-text-secondary">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-rd-bg-soft overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: fill }}
          data-weak={isWeak}
        />
      </div>
    </div>
  );
}
