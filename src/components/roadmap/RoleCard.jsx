import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TRACK_CONFIG } from "@/lib/trackConfig";

// NB: `onTrack` is accepted for backward compatibility with CareerRoadmap's
// handleTrack but no longer wired up — the "Add to Tracker" button was
// removed (users should add specific job postings via Tracker, not generic
// role cards).
export default function RoleCard({ role, onTrack }) { // eslint-disable-line no-unused-vars
  const [expanded, setExpanded] = useState(false);
  const track = TRACK_CONFIG[role.track] || TRACK_CONFIG.track_1;

  // readiness_score is stored 0–1; render as percentage. Allow upstream to
  // pass match_percentage directly.
  const rawScore = role.readiness_score ?? role.match_score;
  const matchPercentage = role.match_percentage ?? (
    rawScore != null ? Math.round(Number(rawScore) * 100) : null
  );

  // Per-role track-scoring breakdown — the two axes that determined the track.
  // Coral fill on the WEAKER axis draws the eye to why this role landed
  // where it did (e.g. Track 2 = qualification high, alignment low).
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
    <div className={`rm-role-card rm-track-${track.color}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="rm-role-card-header"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="rm-track-badge mt-0.5">{track.number}</div>
          <div className="min-w-0">
            <p className="rm-role-card-title truncate">{role.title}</p>
            <div className="rm-role-card-meta">
              {matchPercentage != null && (
                <span>{matchPercentage}% match</span>
              )}
              <span className="rm-track-pill">
                <span className="rm-track-badge" style={{ width: 14, height: 14, fontSize: 9 }}>{track.number}</span>
                {track.name}
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#9C9DA1] flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#9C9DA1] flex-shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="rm-role-card-body">
          {/* Track breakdown — the two scores that placed this role.
              Coral fill on the weaker axis says "this is the bottleneck". */}
          {showBreakdown && (
            <div>
              <p className="rm-eyebrow mb-2.5">Track breakdown</p>
              <div className="flex flex-col gap-3">
                {qualPct != null && (
                  <div className="rm-bar-row">
                    <div className="rm-bar-row-head">
                      <span className="label">Qualification</span>
                      <span className="value">{qualPct}%</span>
                    </div>
                    <div className="rm-bar-track">
                      <div
                        className="rm-bar-fill"
                        data-weak={qualIsWeak}
                        style={{ width: `${qualPct}%` }}
                      />
                    </div>
                  </div>
                )}
                {alignPct != null && (
                  <div className="rm-bar-row">
                    <div className="rm-bar-row-head">
                      <span className="label">Goal alignment</span>
                      <span className="value">{alignPct}%</span>
                    </div>
                    <div className="rm-bar-track">
                      <div
                        className="rm-bar-fill"
                        data-weak={alignIsWeak}
                        style={{ width: `${alignPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {explainText && (
            <div>
              <p className="rm-eyebrow mb-2">Reasoning</p>
              <p className="text-sm text-[#52545A] leading-relaxed whitespace-pre-line">{explainText}</p>
            </div>
          )}

          {role.matched_skills?.length > 0 && (
            <div>
              <p className="rm-eyebrow mb-2">Matched skills</p>
              <div className="flex flex-wrap gap-1.5">
                {role.matched_skills.map((s, i) => (
                  <span key={i} className="rm-skill-pill rm-skill-pill-matched">
                    <Check className="w-3 h-3" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {role.missing_skills?.length > 0 && (
            <div>
              <p className="rm-eyebrow mb-2">Missing skills</p>
              <div className="flex flex-wrap gap-1.5">
                {role.missing_skills.map((s, i) => (
                  <span key={i} className="rm-skill-pill rm-skill-pill-missing">
                    <X className="w-3 h-3" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {role.action_items?.length > 0 && (
            <div>
              <p className="rm-eyebrow mb-2">Action items</p>
              <div className="flex flex-col gap-2">
                {role.action_items.map((item, i) => (
                  <div key={i} className="rm-action-item">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bridge to the Jobs page filtered to this role title — closes
              the "Roadmap says I'm a fit, but where are the actual jobs?"
              loop by deep-linking into the place where specific openings
              are scored per-posting. */}
          {role.title && (
            <Link
              to={`${createPageUrl("Jobs")}?role=${encodeURIComponent(role.title)}`}
              className="rm-jobs-link"
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
