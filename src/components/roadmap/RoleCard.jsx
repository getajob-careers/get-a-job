import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// NB: `onTrack` is accepted for backward compatibility with CareerRoadmap's
// handleTrack but no longer wired up — the "Add to Tracker" button was
// removed (users should add specific job postings via Tracker, not generic
// role cards).

const tierConfig = {
  tier_1: { label: "Tier 1", className: "tier-badge-1", border: "border-l-emerald-500" },
  tier_2: { label: "Tier 2", className: "tier-badge-2", border: "border-l-amber-400" },
  tier_3: { label: "Tier 3", className: "tier-badge-3", border: "border-l-indigo-400" },
};

// Tier strategy label — mirrors the section headers on the Career Roadmap
// page ("Tier 1 — Your Move", etc.) so the in-card pill reinforces the same
// vocabulary instead of inventing a separate readiness scale that contradicts
// the score (a Tier 1 with low fit shouldn't be labelled "Ready & Aligned").
const readinessConfig = {
  tier_1: { label: "Your Move", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  tier_2: { label: "Plan B", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  tier_3: { label: "Work Toward", bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-400" },
};

export default function RoleCard({ role, onTrack }) {
  const [expanded, setExpanded] = useState(false);
  const tier = tierConfig[role.tier] || tierConfig.tier_1;

  // readiness_score is stored 0–1; render as percentage. Allow upstream to pass match_percentage directly.
  const rawScore = role.readiness_score ?? role.match_score;
  const matchPercentage = role.match_percentage ?? (
    rawScore != null ? Math.round(Number(rawScore) * 100) : null
  );
  const readiness = readinessConfig[role.tier];

  // Per-role tier-scoring breakdown — the two axes that determined the tier.
  // qualification_score = readiness_score (how qualified the user is for the role)
  // alignment_score = goal_alignment_score (how on-path the role is to the user's goals)
  // Both stored 0-1; render as percentage bars so the user can see WHY this
  // role landed in its tier (e.g. Tier 2 = qualified but off-path).
  const qualPct = rawScore != null ? Math.round(Number(rawScore) * 100) : null;
  const alignPct = role.goal_alignment_score != null
    ? Math.round(Number(role.goal_alignment_score) * 100)
    : null;
  const showBreakdown = qualPct != null || alignPct != null;

  return (
    <div className={cn("bg-white rounded-xl border border-[#E5E5E5] border-l-4 overflow-hidden transition-all duration-200 hover:border-[#D4D4D4] hover:shadow-sm", tier.border)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider", tier.className)}>
            {tier.label}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0A0A0A] truncate">{role.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {matchPercentage != null && (
                <span className="text-xs text-[#A3A3A3]">{matchPercentage}% match</span>
              )}
              {readiness && (
                <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", readiness.bg, readiness.text)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", readiness.dot)} />
                  {readiness.label}
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#A3A3A3] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#A3A3A3] flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#F0F0F0] pt-4 space-y-4">
          {/* Tier breakdown — the two scores that determined this role's tier */}
          {showBreakdown && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">Tier breakdown</p>
              <div className="space-y-2">
                {qualPct != null && (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#525252]">Qualification</span>
                      <span className="text-[#0A0A0A] font-semibold tabular-nums">{qualPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${qualPct}%` }}
                      />
                    </div>
                  </div>
                )}
                {alignPct != null && (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#525252]">Goal alignment</span>
                      <span className="text-[#0A0A0A] font-semibold tabular-nums">{alignPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${alignPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {role.reasoning && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">Reasoning</p>
              <p className="text-sm text-[#525252] leading-relaxed">{role.reasoning}</p>
            </div>
          )}

          {role.alignment_to_goal && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">Goal Alignment</p>
              <p className="text-sm text-[#525252] leading-relaxed">{role.alignment_to_goal}</p>
            </div>
          )}

          {role.matched_skills?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {role.matched_skills.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
                    <Check className="w-3 h-3" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {role.missing_skills?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {role.missing_skills.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">
                    <X className="w-3 h-3" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {role.action_items?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">Action Items</p>
              <div className="space-y-1.5">
                {role.action_items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-[#A3A3A3] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#525252]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}